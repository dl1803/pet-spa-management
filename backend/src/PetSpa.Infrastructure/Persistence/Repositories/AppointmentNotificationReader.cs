using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class AppointmentNotificationReader(AppDbContext db) : IAppointmentNotificationReader
{
    public async Task<AppointmentNotificationContext?> FindAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var row = await (
            from a in db.Set<Appointment>().AsNoTracking()
            join c in db.Set<Customer>().AsNoTracking() on a.CustomerId equals c.CustomerId
            where a.AppointmentId == appointmentId
            select new { Appointment = a, CustomerUserId = c.UserId })
            .FirstOrDefaultAsync(ct);

        if (row is null) return null;

        var staffUserIds = await (
            from assigned in db.Set<AppointmentStaff>().AsNoTracking()
            join staff in db.Set<Staff>().AsNoTracking() on assigned.StaffId equals staff.StaffId
            where assigned.AppointmentId == appointmentId
            select staff.UserId)
            .Distinct()
            .ToListAsync(ct);

        return new AppointmentNotificationContext(row.Appointment, row.CustomerUserId, staffUserIds);
    }
}
