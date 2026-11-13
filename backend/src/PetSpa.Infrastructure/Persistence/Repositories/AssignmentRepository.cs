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
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default)
    {
        var start = rangeStart.ToUniversalTime();
        var end = rangeEnd.ToUniversalTime();

        return await db.Set<AppointmentStaff>().AsNoTracking()
            .Where(a => a.IsHolding && a.BusyFrom < end && a.BusyUntil > start)
            .Select(a => new StaffBusyWindow(a.StaffId, a.BusyFrom, a.BusyUntil))
            .ToListAsync(ct);
    }

    public Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
        db.Set<SpaAppointment>().AsNoTracking()
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
}
