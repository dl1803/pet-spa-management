using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record UpdateAppointmentRequest(
    Guid? PetId,
    DateTimeOffset? SlotStart,
    List<Guid>? ServiceIds,
    DateTimeOffset? PlannedCheckIn,
    DateTimeOffset? PlannedCheckOut,
    List<Guid>? StaffIds = null,
    Guid? CageId = null,
    bool ConfirmOutOfShift = false);

public sealed record AppointmentStatusResponse(AppointmentStatus Status);

public sealed record CancelAppointmentRequest(CancelReason? Reason);
