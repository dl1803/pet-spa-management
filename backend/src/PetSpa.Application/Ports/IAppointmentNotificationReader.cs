using PetSpa.Domain.Entities;

namespace PetSpa.Application.Ports;

public sealed record AppointmentNotificationContext(
    Appointment Appointment,
    Guid? CustomerUserId,
    IReadOnlyList<Guid> StaffUserIds);

public interface IAppointmentNotificationReader
{
    Task<AppointmentNotificationContext?> FindAsync(Guid appointmentId, CancellationToken ct = default);
}
