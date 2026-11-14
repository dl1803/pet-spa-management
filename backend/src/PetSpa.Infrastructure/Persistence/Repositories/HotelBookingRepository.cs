using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class HotelBookingRepository(AppDbContext db) : IHotelBookingRepository
{
    private static readonly AppointmentStatus[] HeldStatuses =
    [
        AppointmentStatus.Pending,
        AppointmentStatus.Confirmed,
        AppointmentStatus.InStay,
    ];

    public Task<int> CountActiveCagesAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
        db.Set<Cage>().AsNoTracking()
            .CountAsync(c => c.IsActive && c.Species == species && c.SizeGroup == sizeGroup, ct);

    public async Task<IReadOnlyList<HeldHotelStay>> ListHeldHotelStaysAsync(
        Species species, SizeGroup sizeGroup, DateTimeOffset rangeStart, DateTimeOffset rangeEnd,
        CancellationToken ct = default)
    {
        var start = rangeStart.ToUniversalTime();
        var end = rangeEnd.ToUniversalTime();
        var now = DateTimeOffset.UtcNow;

        var query =
            from stay in db.Set<HotelAppointment>().AsNoTracking()
            join pet in db.Set<Pet>().AsNoTracking() on stay.PetId equals pet.PetId
            where pet.Species == species
                && stay.SizeGroup == sizeGroup
                && HeldStatuses.Contains(stay.Status)
                && stay.PlannedCheckIn < end
                && (stay.Status == AppointmentStatus.InStay
                    ? (stay.PlannedCheckOut > start || now > start)
                    : stay.PlannedCheckOut > start)
            orderby stay.PlannedCheckIn, stay.AppointmentId
            select new HeldHotelStay(
                stay.PlannedCheckIn,
                stay.Status == AppointmentStatus.InStay && stay.PlannedCheckOut < now
                    ? now
                    : stay.PlannedCheckOut);

        return await query.ToListAsync(ct);
    }

    public async Task AddHotelAppointmentAsync(HotelAppointment appointment, CancellationToken ct = default)
    {
        db.Set<HotelAppointment>().Add(appointment);
        await db.SaveChangesAsync(ct);
    }
}

