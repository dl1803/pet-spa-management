using System.Text.Json.Serialization;
using PetSpa.Application.Services.Payments;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record OnlinePaymentRequest(PaymentGateway? Gateway);

public sealed record OnlinePaymentCreated(string PaymentUrl, string TxnRef)
{
    public static OnlinePaymentCreated From(OnlinePaymentStart start) => new(start.PaymentUrl, start.TxnRef);
}

public sealed record VnpayIpnResponse(
    [property: JsonPropertyName("RspCode")] string RspCode,
    [property: JsonPropertyName("Message")] string Message)
{
    public static VnpayIpnResponse Unprocessed { get; } = new("99", "Unknown error");
}
