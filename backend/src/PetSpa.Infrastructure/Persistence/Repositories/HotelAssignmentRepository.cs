using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class HotelAssignmentRepository(AppDbContext db) : IHotelAssignmentRepository
{
    private static readonly AppointmentStatus[] OccupyingStatuses =
    [
        AppointmentStatus.Confirmed,
        AppointmentStatus.InStay,
    ];

    public Task<HotelStayForAssignment?> FindHotelStayAsync(Guid appointmentId, CancellationToken ct = default) =>
        (from stay in db.Set<HotelAppointment>().AsNoTracking()
         join pet in db.Set<Pet>().AsNoTracking() on stay.PetId equals pet.PetId
         where stay.AppointmentId == appointmentId
         select new HotelStayForAssignment(
             stay.AppointmentId,
             stay.Status,
             pet.Species,
             stay.SizeGroup,
             stay.PlannedCheckIn,
             stay.PlannedCheckOut))
        .FirstOrDefaultAsync(ct);

    public async Task<IReadOnlyList<Cage>> ListCagesAsync(CancellationToken ct = default) =>
        await db.Set<Cage>().AsNoTracking().OrderBy(c => c.Code).ToListAsync(ct);

    public async Task<IReadOnlyList<CageStayWindow>> ListCageStayWindowsAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default)
    {
        var start = rangeStart.ToUniversalTime();
        var end = rangeEnd.ToUniversalTime();
        var now = DateTimeOffset.UtcNow;

        return await db.Set<HotelAppointment>().AsNoTracking()
            .Where(s => s.CageId != null
                && OccupyingStatuses.Contains(s.Status)
                && s.PlannedCheckIn < end
                && (s.Status == AppointmentStatus.InStay
                    ? (s.PlannedCheckOut > start || now > start)
                    : s.PlannedCheckOut > start))
            .Select(s => new CageStayWindow(
                s.CageId!.Value,
                s.PlannedCheckIn,
                s.Status == AppointmentStatus.InStay && s.PlannedCheckOut < now
                    ? now
                    : s.PlannedCheckOut))
            .ToListAsync(ct);
    }
}

