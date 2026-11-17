using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class AppointmentChangeRepository(AppDbContext db) : IAppointmentChangeRepository
{
    public async Task<int> GetChangeCancelDeadlineMinutesAsync(CancellationToken ct = default)
    {
        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "Booking.ChangeCancelDeadlineMinutes")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        if (value is null)
            throw new InvalidOperationException("Thiếu cấu hình Booking.ChangeCancelDeadlineMinutes.");

        if (!int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var minutes) || minutes <= 0)
            throw new InvalidOperationException(
                "Cấu hình Booking.ChangeCancelDeadlineMinutes phải là số phút nguyên dương.");

        return minutes;
    }

    public async Task<AppointmentChangeTarget?> FindTargetAsync(
        Guid appointmentId, CancellationToken ct = default)
    {
        var row = await (
            from a in db.Set<Appointment>().AsNoTracking()
            join c in db.Set<Customer>().AsNoTracking() on a.CustomerId equals c.CustomerId
            where a.AppointmentId == appointmentId
            select new { Appointment = a, OwnerUserId = c.UserId })
            .FirstOrDefaultAsync(ct);

        return row is null ? null : new AppointmentChangeTarget(row.Appointment, row.OwnerUserId);
    }

    public Task<Appointment?> FindForUpdateAsync(Guid appointmentId, CancellationToken ct = default) =>
        db.Set<Appointment>().FirstOrDefaultAsync(a => a.AppointmentId == appointmentId, ct);

    public async Task SaveSpaChangeAsync(
        SpaAppointment appointment, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default)
    {
        EnsureTracked(appointment);

        var wanted = serviceIds.Distinct().ToList();

        var currentServices = await db.Set<AppointmentService>()
            .Where(s => s.AppointmentId == appointment.AppointmentId)
            .ToListAsync(ct);

        db.Set<AppointmentService>().RemoveRange(
            currentServices.Where(s => !wanted.Contains(s.ServiceId)).ToList());
        db.Set<AppointmentService>().AddRange(
            wanted
                .Where(serviceId => currentServices.All(s => s.ServiceId != serviceId))
                .Select(serviceId => new AppointmentService
                {
                    AppointmentId = appointment.AppointmentId,
                    ServiceId = serviceId,
                })
                .ToList());

        var staff = await db.Set<AppointmentStaff>()
            .Where(s => s.AppointmentId == appointment.AppointmentId)
            .ToListAsync(ct);
        db.Set<AppointmentStaff>().RemoveRange(staff);

        await db.SaveChangesAsync(ct);
    }

    public async Task SaveHotelChangeAsync(HotelAppointment appointment, CancellationToken ct = default)
    {
        EnsureTracked(appointment);
        await db.SaveChangesAsync(ct);
    }

    public async Task SaveCancellationAsync(Appointment appointment, CancellationToken ct = default)
    {
        EnsureTracked(appointment);

        if (appointment is SpaAppointment)
        {
            var holding = await db.Set<AppointmentStaff>()
                .Where(s => s.AppointmentId == appointment.AppointmentId && s.IsHolding)
                .ToListAsync(ct);

            foreach (var row in holding) row.IsHolding = false;
        }

        await db.SaveChangesAsync(ct);
    }

    private void EnsureTracked(Appointment appointment)
    {
        if (db.Entry(appointment).State == EntityState.Detached)
            throw new InvalidOperationException("Lịch hẹn phải được nạp bằng FindForUpdateAsync trước khi lưu.");
    }
}
