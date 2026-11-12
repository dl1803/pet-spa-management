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
        Guid customerUserId, AppointmentType? type, AppointmentStatus? status, Guid? petId, int page, int pageSize,
        CancellationToken ct = default)
    {
        var appointments = db.Set<Appointment>().AsNoTracking();

        if (type == AppointmentType.Spa) appointments = appointments.Where(a => a is SpaAppointment);
        else if (type == AppointmentType.Hotel) appointments = appointments.Where(a => a is HotelAppointment);

        if (status is { } wantedStatus) appointments = appointments.Where(a => a.Status == wantedStatus);

        if (petId is { } wantedPetId) appointments = appointments.Where(a => a.PetId == wantedPetId);

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

    public async Task<PagedResult<AppointmentListItem>> ListAllAsync(
        AppointmentType? type, AppointmentStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        var appointments = db.Set<Appointment>().AsNoTracking();

        if (type == AppointmentType.Spa) appointments = appointments.Where(a => a is SpaAppointment);
        else if (type == AppointmentType.Hotel) appointments = appointments.Where(a => a is HotelAppointment);

        if (status is { } wantedStatus) appointments = appointments.Where(a => a.Status == wantedStatus);

        var query =
            from a in appointments
            join p in db.Set<Pet>() on a.PetId equals p.PetId
            select new { Appointment = a, PetName = p.Name };

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderBy(x => x.Appointment.CreatedAt)
            .ThenBy(x => x.Appointment.AppointmentId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = rows.Select(r => new AppointmentListItem(r.Appointment, r.PetName)).ToList();
        return new PagedResult<AppointmentListItem>(items, page, pageSize, total);
    }

    public async Task<AppointmentDetailData?> FindDetailAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var row = await (
            from a in db.Set<Appointment>().AsNoTracking()
            join c in db.Set<Customer>() on a.CustomerId equals c.CustomerId
            join p in db.Set<Pet>() on a.PetId equals p.PetId
            where a.AppointmentId == appointmentId
            select new { Appointment = a, OwnerUserId = c.UserId, PetName = p.Name })
            .FirstOrDefaultAsync(ct);

        if (row is null) return null;

        // Dịch vụ và nhân viên chỉ có ở lịch spa.
        if (row.Appointment is not SpaAppointment)
            return new AppointmentDetailData(row.Appointment, row.OwnerUserId, row.PetName, [], []);

        var serviceRows = await (
            from s in db.Set<AppointmentService>().AsNoTracking()
            join sv in db.Set<Service>() on s.ServiceId equals sv.ServiceId
            where s.AppointmentId == appointmentId
            orderby sv.Name, sv.ServiceId
            select new { s.ServiceId, sv.Name, s.IsDone, s.DoneAt, s.Note })
            .ToListAsync(ct);

        var staffRows = await (
            from s in db.Set<AppointmentStaff>().AsNoTracking()
            join st in db.Set<Staff>() on s.StaffId equals st.StaffId
            where s.AppointmentId == appointmentId
            orderby s.AssignedAt, s.StaffId
            select new { s.StaffId, st.FullName, s.IsHolding, s.AssignedAt })
            .ToListAsync(ct);

        return new AppointmentDetailData(
            row.Appointment,
            row.OwnerUserId,
            row.PetName,
            serviceRows.Select(r => new AppointmentServiceLine(r.ServiceId, r.Name, r.IsDone, r.DoneAt, r.Note)).ToList(),
            staffRows.Select(r => new AppointmentStaffLine(r.StaffId, r.FullName, r.IsHolding, r.AssignedAt)).ToList());
    }
}

