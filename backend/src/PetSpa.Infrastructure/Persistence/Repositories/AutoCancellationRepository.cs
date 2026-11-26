using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class AutoCancellationRepository(AppDbContext db) : IAutoCancellationRepository
{
    public async Task<IReadOnlyList<Guid>> ListNoShowCandidateIdsAsync(
        DateTimeOffset startedBefore, CancellationToken ct = default)
    {
        var cutoff = startedBefore.ToUniversalTime();

        var spa = await db.Set<SpaAppointment>().AsNoTracking()
            .Where(a => a.Status == AppointmentStatus.Confirmed && a.SlotStart < cutoff)
            .Select(a => new { a.AppointmentId, Start = a.SlotStart })
            .ToListAsync(ct);

        var hotel = await db.Set<HotelAppointment>().AsNoTracking()
            .Where(a => a.Status == AppointmentStatus.Confirmed && a.PlannedCheckIn < cutoff)
            .Select(a => new { a.AppointmentId, Start = a.PlannedCheckIn })
            .ToListAsync(ct);

        return spa.Concat(hotel)
            .OrderBy(a => a.Start)
            .ThenBy(a => a.AppointmentId)
            .Select(a => a.AppointmentId)
            .ToList();
    }
}
