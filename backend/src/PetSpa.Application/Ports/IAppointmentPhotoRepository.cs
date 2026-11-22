using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public interface IAppointmentPhotoRepository
{
    Task<Guid?> FindSpaStaffIdByUserIdAsync(Guid userId, CancellationToken ct = default);

    Task AddAsync(AppointmentPhoto photo, CancellationToken ct = default);

    Task<IReadOnlyList<AppointmentPhoto>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default);

    Task<DateTimeOffset?> FindLatestBeforePhotoUploadedAtByPetAsync(Guid petId, CancellationToken ct = default);

    Task<bool> HasPhotoAsync(Guid appointmentId, PhotoKind kind, CancellationToken ct = default);

    Task<int> GetValidityDaysAsync(CancellationToken ct = default);
}
