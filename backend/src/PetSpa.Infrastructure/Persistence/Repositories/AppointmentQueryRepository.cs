using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

// Adapter của IAppointmentQueryRepository.
public sealed class AppointmentQueryRepository(AppDbContext db) : IAppointmentQueryRepository
{
    public async Task<PagedResult<AppointmentListItem>> ListByCustomerUserAsync(
        Guid customerUserId, AppointmentType? type, AppointmentStatus? status, int page, int pageSize,
        CancellationToken ct = default)
    {
        var appointments = db.Set<Appointment>().AsNoTracking();

        if (type == AppointmentType.Spa) appointments = appointments.Where(a => a is SpaAppointment);
        else if (type == AppointmentType.Hotel) appointments = appointments.Where(a => a is HotelAppointment);

        if (status is { } wantedStatus) appointments = appointments.Where(a => a.Status == wantedStatus);

        // Phạm vi theo token (BR-16): chỉ lịch của khách có Customer.UserId trùng người gọi.
        var query =
            from a in appointments
            join c in db.Set<Customer>() on a.CustomerId equals c.CustomerId
            join p in db.Set<Pet>() on a.PetId equals p.PetId
            where c.UserId == customerUserId
            select new { Appointment = a, PetName = p.Name };

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(x => x.Appointment.CreatedAt)
            .ThenByDescending(x => x.Appointment.AppointmentId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = rows.Select(r => new AppointmentListItem(r.Appointment, r.PetName)).ToList();
        return new PagedResult<AppointmentListItem>(items, page, pageSize, total);
    }
}

