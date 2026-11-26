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
            .Where(a => a.Status == AppointmentStatus.Confirmed
                && a.ActualWeightKg == null
                && a.PlannedCheckIn < cutoff
                && !db.Set<CostConfirmation>().Any(c =>
                    c.AppointmentId == a.AppointmentId && c.Status == ConfirmationStatus.Pending))
            .Select(a => new { a.AppointmentId, Start = a.PlannedCheckIn })
            .ToListAsync(ct);

        return spa.Concat(hotel)
            .OrderBy(a => a.Start)
            .ThenBy(a => a.AppointmentId)
            .Select(a => a.AppointmentId)
            .ToList();
    }

    public async Task<IReadOnlyList<Guid>> ListOverdueCostConfirmationAppointmentIdsAsync(
        DateTimeOffset now, CancellationToken ct = default)
    {
        var nowUtc = now.ToUniversalTime();

        var spa = await (
            from confirmation in db.Set<CostConfirmation>().AsNoTracking()
            join appointment in db.Set<SpaAppointment>().AsNoTracking()
                on confirmation.AppointmentId equals appointment.AppointmentId
            where confirmation.Status == ConfirmationStatus.Pending
                  && confirmation.ExpiresAt < nowUtc
                  && appointment.Status == AppointmentStatus.Received
            select new { confirmation.ConfirmationId, confirmation.AppointmentId, confirmation.ExpiresAt })
            .ToListAsync(ct);

        var hotel = await (
            from confirmation in db.Set<CostConfirmation>().AsNoTracking()
            join appointment in db.Set<HotelAppointment>().AsNoTracking()
                on confirmation.AppointmentId equals appointment.AppointmentId
            where confirmation.Status == ConfirmationStatus.Pending
                  && confirmation.ExpiresAt < nowUtc
                  && appointment.Status == AppointmentStatus.Confirmed
            select new { confirmation.ConfirmationId, confirmation.AppointmentId, confirmation.ExpiresAt })
            .ToListAsync(ct);

        return spa.Concat(hotel)
            .OrderBy(c => c.ExpiresAt)
            .ThenBy(c => c.ConfirmationId)
            .Select(c => c.AppointmentId)
            .ToList();
    }
}
