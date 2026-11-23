using PetSpa.Domain.Entities;

namespace PetSpa.Application.Ports;

public interface IAppointmentProgressRepository
{
    Task<AppointmentService?> FindServiceLineAsync(Guid appointmentId, Guid serviceId, CancellationToken ct = default);

    Task<IReadOnlyList<AppointmentService>> ListServiceLinesAsync(Guid appointmentId, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
