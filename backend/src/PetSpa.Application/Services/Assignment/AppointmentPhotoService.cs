using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Assignment;

public sealed record AppointmentPhotoView(Guid PhotoId, PhotoKind Kind, string Url, DateTimeOffset UploadedAt);

public sealed class AppointmentPhotoService(
    IAppointmentQueryRepository appointments,
    IAppointmentPhotoRepository photos,
    IPhotoStorage storage,
    IConcurrencyGuard concurrency,
    IStaffRoleReader staffRoles)
{
    private static readonly TimeSpan UrlLifetime = TimeSpan.FromMinutes(60);

    public async Task<Guid> UploadAsync(
        CurrentUser user, Guid appointmentId, PhotoKind kind, Stream content, CancellationToken ct = default)
    {
        if (user.Role != UserRole.Staff)
            throw new BusinessException(ErrorCodes.Forbidden);

        var staffId = await photos.FindSpaStaffIdByUserIdAsync(user.UserId, ct)
            ?? throw new BusinessException(ErrorCodes.Forbidden);

        await EnsureCanUploadAsync(user, appointmentId, kind, ct);

        var format = await DetectFormatAsync(content, ct)
            ?? throw new BusinessException(ErrorCodes.ValidationError, "Chỉ nhận tệp ảnh JPEG, PNG hoặc WebP.");

        var photoId = Guid.NewGuid();
        var storageKey = $"appointments/{appointmentId}/{kind.ToString().ToLowerInvariant()}-{photoId}.{format.Extension}";

        try
        {
            await storage.UploadAsync(storageKey, content, format.ContentType, ct);

            await concurrency.RunAsync(async () =>
            {
                await concurrency.LockAppointmentAsync(appointmentId, ct);

                await EnsureCanUploadAsync(user, appointmentId, kind, ct);

                await photos.AddAsync(new AppointmentPhoto
                {
                    PhotoId = photoId,
                    AppointmentId = appointmentId,
                    Kind = kind,
                    StorageKey = storageKey,
                    UploadedByStaffId = staffId,
                    UploadedAt = DateTimeOffset.UtcNow,
                }, ct);
            }, ct);
        }
        catch
        {
            await TryDeleteAsync(storageKey);
            throw;
        }

        return photoId;
    }

    public async Task<IReadOnlyList<AppointmentPhotoView>> ListAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        if (user.Role == UserRole.Staff
            && await staffRoles.GetStaffRoleAsync(user.UserId, ct) != StaffRole.SpaStaff)
            throw new BusinessException(ErrorCodes.Forbidden);

        var detail = await appointments.FindDetailAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        switch (user.Role)
        {
            case UserRole.Manager:
                break;
            case UserRole.Customer:
                OwnershipGuard.EnsureOwner(user, detail.OwnerUserId);
                break;
            case UserRole.Staff:
                if (!await appointments.IsAssignedToSpaStaffAsync(appointmentId, user.UserId, ct))
                    throw new BusinessException(ErrorCodes.Forbidden);
                break;
            default:
                throw new BusinessException(ErrorCodes.Forbidden);
        }

        var rows = await photos.ListByAppointmentAsync(appointmentId, ct);
        if (rows.Count == 0)
            return [];

        var urls = await storage.CreateTemporaryUrlsAsync(
            rows.Select(r => r.StorageKey).ToList(), UrlLifetime, ct);

        return rows
            .Select((r, i) => new AppointmentPhotoView(r.PhotoId, r.Kind, urls[i], r.UploadedAt))
            .ToList();
    }

    private async Task EnsureCanUploadAsync(CurrentUser user, Guid appointmentId, PhotoKind kind, CancellationToken ct)
    {
        var detail = await appointments.FindDetailAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (!await appointments.IsAssignedToSpaStaffAsync(appointmentId, user.UserId, ct))
            throw new BusinessException(ErrorCodes.Forbidden);

        if (detail.Appointment is not SpaAppointment spa)
            throw new BusinessException(ErrorCodes.Forbidden);

        spa.EnsurePhotoAllowed(kind);
    }

    private static async Task<PhotoFormat?> DetectFormatAsync(Stream content, CancellationToken ct)
    {
        var header = new byte[PhotoRules.HeaderLength];
        var read = await content.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, ct);

        var format = PhotoRules.Detect(header.AsSpan(0, read));
        if (format is not null)
            content.Position = 0;

        return format;
    }

    private async Task TryDeleteAsync(string storageKey)
    {
        try
        {
            await storage.DeleteAsync(storageKey, CancellationToken.None);
        }
        catch
        {
        }
    }
}
