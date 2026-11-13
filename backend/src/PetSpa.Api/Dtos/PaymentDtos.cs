using PetSpa.Application.Services.Payments;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record OnlinePaymentRequest(PaymentGateway? Gateway);

public sealed record OnlinePaymentCreated(string PaymentUrl, string TxnRef)
{
    public static OnlinePaymentCreated From(OnlinePaymentStart start) => new(start.PaymentUrl, start.TxnRef);
}
