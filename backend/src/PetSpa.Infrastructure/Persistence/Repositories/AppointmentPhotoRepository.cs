using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class AppointmentPhotoRepository(AppDbContext db) : IAppointmentPhotoRepository
{
    public Task<Guid?> FindSpaStaffIdByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        db.Set<Staff>()
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.StaffRole == StaffRole.SpaStaff)
            .Select(s => (Guid?)s.StaffId)
            .FirstOrDefaultAsync(ct);

    public async Task AddAsync(AppointmentPhoto photo, CancellationToken ct = default)
    {
        db.Set<AppointmentPhoto>().Add(photo);
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AppointmentPhoto>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
        await db.Set<AppointmentPhoto>()
            .AsNoTracking()
            .Where(p => p.AppointmentId == appointmentId)
            .OrderBy(p => p.UploadedAt)
            .ThenBy(p => p.PhotoId)
            .ToListAsync(ct);

    public Task<DateTimeOffset?> FindLatestBeforePhotoUploadedAtByPetAsync(Guid petId, CancellationToken ct = default) =>
        (from photo in db.Set<AppointmentPhoto>().AsNoTracking()
         join appointment in db.Set<Appointment>().AsNoTracking() on photo.AppointmentId equals appointment.AppointmentId
         where appointment.PetId == petId && photo.Kind == PhotoKind.Before
         orderby photo.UploadedAt descending
         select (DateTimeOffset?)photo.UploadedAt)
        .FirstOrDefaultAsync(ct);

    public Task<bool> HasPhotoAsync(Guid appointmentId, PhotoKind kind, CancellationToken ct = default) =>
        db.Set<AppointmentPhoto>()
            .AsNoTracking()
            .AnyAsync(p => p.AppointmentId == appointmentId && p.Kind == kind, ct);

    public async Task<int> GetValidityDaysAsync(CancellationToken ct = default)
    {
        const int defaultValidityDays = 7;

        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "Photo.ValidityDays")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var days) && days > 0
            ? days
            : defaultValidityDays;
    }
}
