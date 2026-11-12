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
}

