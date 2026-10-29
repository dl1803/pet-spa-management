using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Entities;

public class Payment
{
    public Guid PaymentId { get; set; }
    public Guid AppointmentId { get; set; }
    public PaymentKind Kind { get; set; }
    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Unpaid;
    public PaymentMethod? Method { get; set; }
    public decimal? ReceivedAmount { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public Guid? ConfirmedByUserId { get; set; }
}

