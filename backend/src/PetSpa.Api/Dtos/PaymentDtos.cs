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
    public static VnpayIpnResponse Confirmed { get; } = new("00", "Confirm Success");
    public static VnpayIpnResponse OrderNotFound { get; } = new("01", "Order not found");
    public static VnpayIpnResponse AlreadyConfirmed { get; } = new("02", "Order already confirmed");
    public static VnpayIpnResponse InvalidAmount { get; } = new("04", "Invalid amount");
    public static VnpayIpnResponse Unprocessed { get; } = new("99", "Unknown error");
    public static VnpayIpnResponse InvalidChecksum { get; } = new("97", "Invalid Checksum");

    public static VnpayIpnResponse From(PaymentCallbackStatus status) => status switch
    {
        PaymentCallbackStatus.Paid or PaymentCallbackStatus.Failed => Confirmed,
        PaymentCallbackStatus.AlreadyProcessed => AlreadyConfirmed,
        PaymentCallbackStatus.TxnNotFound => OrderNotFound,
        PaymentCallbackStatus.AmountMismatch => InvalidAmount,
        _ => Unprocessed,
    };
}
