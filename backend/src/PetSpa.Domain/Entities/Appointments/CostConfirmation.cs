using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Domain.Entities;

public class CostConfirmation
{
    public Guid ConfirmationId { get; set; }
    public Guid AppointmentId { get; set; }
    public decimal ActualWeightKg { get; set; }
    public SizeGroup NewSizeGroup { get; set; }
    public decimal OldAmount { get; set; }
    public decimal NewAmount { get; set; }
    public ConfirmationStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RespondedAt { get; set; }
    public Guid? RespondedByUserId { get; set; }

    public bool IsOverdue(DateTimeOffset now) =>
        Status == ConfirmationStatus.Pending && now > ExpiresAt;

    public void Expire(DateTimeOffset now)
    {
        if (!IsOverdue(now))
            throw new BusinessException(ErrorCodes.InvalidTransition);

        Status = ConfirmationStatus.Expired;
    }

    public void Accept(Guid respondedByUserId, DateTimeOffset now) =>
        Respond(ConfirmationStatus.Accepted, respondedByUserId, now);

    public void Reject(Guid respondedByUserId, DateTimeOffset now) =>
        Respond(ConfirmationStatus.Rejected, respondedByUserId, now);

    private void Respond(ConfirmationStatus status, Guid respondedByUserId, DateTimeOffset now)
    {
        if (Status != ConfirmationStatus.Pending)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        if (now > ExpiresAt)
            throw new BusinessException(ErrorCodes.CostConfirmationExpired);

        Status = status;
        RespondedAt = now;
        RespondedByUserId = respondedByUserId;
    }
}
