using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class AssignmentRepository(AppDbContext db) : IAssignmentRepository
{
    public async Task<IReadOnlyList<SpaStaffCandidate>> ListActiveSpaStaffAsync(CancellationToken ct = default)
    {
        var query =
            from staff in db.Set<Staff>().AsNoTracking()
            join user in db.Users.AsNoTracking() on staff.UserId equals user.Id
            where staff.StaffRole == StaffRole.SpaStaff && user.IsActive
            orderby staff.FullName, staff.StaffId
            select new SpaStaffCandidate(staff.StaffId, staff.FullName);

        return await query.ToListAsync(ct);
    }

    public async Task<IReadOnlyList<StaffBusyWindow>> ListHoldingStaffWindowsAsync(
        DateTimeOffset rangeStart,
        DateTimeOffset rangeEnd,
        Guid? excludeAppointmentId = null,
        CancellationToken ct = default)
    {
        var start = rangeStart.ToUniversalTime();
        var end = rangeEnd.ToUniversalTime();

        var query =
            from a in db.Set<AppointmentStaff>().AsNoTracking()
            join appointment in db.Set<Appointment>().AsNoTracking()
                on a.AppointmentId equals appointment.AppointmentId
            where a.IsHolding
                && appointment.Status != AppointmentStatus.Cancelled
                && appointment.Status != AppointmentStatus.Completed
                && a.BusyFrom < end
                && a.BusyUntil > start
            select a;

        if (excludeAppointmentId.HasValue)
        {
            query = query.Where(a => a.AppointmentId != excludeAppointmentId.Value);
        }

        return await query
            .Select(a => new StaffBusyWindow(a.StaffId, a.BusyFrom, a.BusyUntil))
            .ToListAsync(ct);
    }

    public Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
        db.Set<SpaAppointment>()
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId, ct);

    public async Task<int> GetSuggestLookbackDaysAsync(CancellationToken ct = default)
    {
        const int defaultLookbackDays = 30;

        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "Suggest.LookbackDays")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var days) && days > 0
            ? days
            : defaultLookbackDays;
    }

    public async Task<IReadOnlyDictionary<Guid, int>> CountRecentAssignmentsAsync(
        DateTimeOffset since, CancellationToken ct = default)
    {
        var sinceUtc = since.ToUniversalTime();

        return await (
            from assigned in db.Set<AppointmentStaff>().AsNoTracking()
            join appointment in db.Set<Appointment>().AsNoTracking()
                on assigned.AppointmentId equals appointment.AppointmentId
            where assigned.AssignedAt >= sinceUtc && appointment.Status != AppointmentStatus.Cancelled
            group assigned by assigned.StaffId into grouped
            select new { StaffId = grouped.Key, Count = grouped.Count() })
            .ToDictionaryAsync(x => x.StaffId, x => x.Count, ct);
    }

    public async Task SetStaffAssignmentsAsync(
        Guid appointmentId,
        IReadOnlyList<AppointmentStaff> staffAssignments,
        CancellationToken ct = default)
    {
        var existing = await db.Set<AppointmentStaff>()
            .Where(a => a.AppointmentId == appointmentId)
            .ToListAsync(ct);

        if (existing.Count > 0)
        {
            db.Set<AppointmentStaff>().RemoveRange(existing);
        }

        if (staffAssignments.Count > 0)
        {
            db.Set<AppointmentStaff>().AddRange(staffAssignments);
        }

        await db.SaveChangesAsync(ct);
    }

    public Task AddStaffAssignmentsAsync(
        IReadOnlyList<AppointmentStaff> staffAssignments, CancellationToken ct = default)
    {
        if (staffAssignments.Count == 0) return Task.CompletedTask;
        return SetStaffAssignmentsAsync(staffAssignments[0].AppointmentId, staffAssignments, ct);
    }

    public Task<int> CountActiveHoldingStaffAsync(Guid appointmentId, CancellationToken ct = default) =>
        (from assigned in db.Set<AppointmentStaff>().AsNoTracking()
         join staff in db.Set<Staff>().AsNoTracking() on assigned.StaffId equals staff.StaffId
         join user in db.Users.AsNoTracking() on staff.UserId equals user.Id
         where assigned.AppointmentId == appointmentId
             && assigned.IsHolding
             && staff.StaffRole == StaffRole.SpaStaff
             && user.IsActive
         select assigned)
        .CountAsync(ct);

    public async Task ReleaseStaffHoldsAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var holding = await db.Set<AppointmentStaff>()
            .Where(a => a.AppointmentId == appointmentId && a.IsHolding)
            .ToListAsync(ct);

        foreach (var row in holding)
        {
            row.IsHolding = false;
        }
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);

    public async Task<SpaAmountInput?> GetSpaAmountInputAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var pet = await (
            from a in db.Set<Appointment>().AsNoTracking()
            join p in db.Set<Pet>().AsNoTracking() on a.PetId equals p.PetId
            where a.AppointmentId == appointmentId
            select new { p.Species })
            .FirstOrDefaultAsync(ct);

        if (pet is null) return null;

        var serviceIds = await db.Set<AppointmentService>().AsNoTracking()
            .Where(s => s.AppointmentId == appointmentId)
            .Select(s => s.ServiceId)
            .ToListAsync(ct);

        var pricing = await db.Set<ServicePricing>().AsNoTracking()
            .Where(p => serviceIds.Contains(p.ServiceId) && p.Species == pet.Species)
            .ToListAsync(ct);

        return new SpaAmountInput(pet.Species, serviceIds, pricing);
    }
}
