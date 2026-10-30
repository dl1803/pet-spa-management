using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Entities;

public class PaymentTransaction
{
    public Guid TxnId { get; set; }
    public Guid PaymentId { get; set; }
    public PaymentGateway Gateway { get; set; }
    public string TxnRef { get; set; } = string.Empty;
    public decimal RequestedAmount { get; set; }
    public decimal? ConfirmedAmount { get; set; }
    public TransactionResult? Result { get; set; }
    public bool? SignatureValid { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CallbackAt { get; set; }
}

