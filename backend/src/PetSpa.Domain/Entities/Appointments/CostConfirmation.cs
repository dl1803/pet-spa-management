using PetSpa.Domain.Enums;

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
}

