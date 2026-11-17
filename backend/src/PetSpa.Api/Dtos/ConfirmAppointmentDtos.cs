using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record ConfirmAppointmentRequest(
    List<Guid>? StaffIds = null,
    Guid? CageId = null,
    bool ConfirmOutOfShift = false)
{
    public ConfirmAppointmentRequest(List<Guid>? staffIds, bool confirmOutOfShift)
        : this(staffIds, null, confirmOutOfShift)
    {
    }
}

public sealed record RejectAppointmentResponse(AppointmentStatus Status, CancelReason Reason);

