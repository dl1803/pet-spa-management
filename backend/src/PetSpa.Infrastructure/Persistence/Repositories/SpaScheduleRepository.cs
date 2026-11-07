using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class SpaScheduleRepository(AppDbContext db) : ISpaScheduleRepository
{
    private static readonly AppointmentStatus[] HeldStatuses =
    [
        AppointmentStatus.Pending,
        AppointmentStatus.Confirmed,
        AppointmentStatus.Received,
        AppointmentStatus.InProgress,
    ];

    public async Task<int> GetBufferMinutesAsync(CancellationToken ct = default)
    {
        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "Booking.BufferMinutes")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        if (value is null) throw new InvalidOperationException("Thiếu cấu hình Booking.BufferMinutes.");

        return int.Parse(value, CultureInfo.InvariantCulture);
    }

    public async Task<IReadOnlyList<StaffShiftWindow>> ListActiveSpaStaffShiftsAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default)
    {
        var start = rangeStart.ToUniversalTime();
        var end = rangeEnd.ToUniversalTime();

        var query =
            from shift in db.Set<WorkShift>().AsNoTracking()
            join staff in db.Set<Staff>().AsNoTracking() on shift.StaffId equals staff.StaffId
            join user in db.Users.AsNoTracking() on staff.UserId equals user.Id
            where staff.StaffRole == StaffRole.SpaStaff
                && user.IsActive
                && shift.ShiftStart < end
                && shift.ShiftEnd > start
            orderby shift.ShiftStart, shift.StaffId
            select new StaffShiftWindow(shift.StaffId, shift.ShiftStart, shift.ShiftEnd);

        return await query.ToListAsync(ct);
    }

    public async Task<IReadOnlyList<HeldSpaBooking>> ListHeldSpaBookingsAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default)
    {
        var start = rangeStart.ToUniversalTime();
        var end = rangeEnd.ToUniversalTime();

        return await db.Set<SpaAppointment>().AsNoTracking()
            .Where(a => HeldStatuses.Contains(a.Status) && a.SlotStart < end && a.BusyUntil > start)
            .OrderBy(a => a.SlotStart)
            .Select(a => new HeldSpaBooking(a.SlotStart, a.BusyUntil, a.StaffRequired))
            .ToListAsync(ct);
    }
}

