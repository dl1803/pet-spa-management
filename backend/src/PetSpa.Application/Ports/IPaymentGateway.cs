using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record GatewayCallback(string TxnRef, decimal ConfirmedAmount, bool Succeeded);

public interface IPaymentGateway
{
    PaymentGateway Gateway { get; }

    string CreatePaymentUrl(PaymentTransaction transaction, string clientIp);

    bool VerifyCallbackSignature(IReadOnlyDictionary<string, string> parameters);

    GatewayCallback? ReadCallback(IReadOnlyDictionary<string, string> parameters);
}
