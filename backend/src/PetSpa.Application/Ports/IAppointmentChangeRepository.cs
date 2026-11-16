using PetSpa.Domain.Entities;

namespace PetSpa.Application.Ports;

public sealed record AppointmentChangeTarget(Appointment Appointment, Guid? OwnerUserId);

public interface IAppointmentChangeRepository
{
    Task<int> GetChangeCancelDeadlineMinutesAsync(CancellationToken ct = default);

    Task<AppointmentChangeTarget?> FindTargetAsync(Guid appointmentId, CancellationToken ct = default);

    Task<Appointment?> FindForUpdateAsync(Guid appointmentId, CancellationToken ct = default);

    Task SaveSpaChangeAsync(
        SpaAppointment appointment, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default);

    Task SaveHotelChangeAsync(HotelAppointment appointment, CancellationToken ct = default);
}
