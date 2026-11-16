using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record UpdateAppointmentRequest(
    Guid? PetId,
    DateTimeOffset? SlotStart,
    List<Guid>? ServiceIds,
    DateTimeOffset? PlannedCheckIn,
    DateTimeOffset? PlannedCheckOut);

public sealed record AppointmentStatusResponse(AppointmentStatus Status);
