using PetSpa.Domain.Entities;

namespace PetSpa.Application.Ports;

public interface IAppointmentPhotoRepository
{
    Task<Guid?> FindSpaStaffIdByUserIdAsync(Guid userId, CancellationToken ct = default);

    Task AddAsync(AppointmentPhoto photo, CancellationToken ct = default);
}
