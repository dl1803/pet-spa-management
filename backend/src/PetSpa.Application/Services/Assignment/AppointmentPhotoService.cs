using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Assignment;

public sealed class AppointmentPhotoService(
    IAppointmentQueryRepository appointments,
    IAppointmentPhotoRepository photos,
    IPhotoStorage storage,
    IConcurrencyGuard concurrency)
{
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
