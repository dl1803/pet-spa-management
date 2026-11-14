using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Payments;

public sealed record OnlinePaymentStart(string PaymentUrl, string TxnRef);

public sealed class PaymentService(IPaymentRepository payments, IPaymentGateway gateway)
{
    public async Task<OnlinePaymentStart> StartOnlineAsync(
        CurrentUser user, Guid paymentId, PaymentGateway requestedGateway, string clientIp,
        CancellationToken ct = default)
    {
        if (user.Role != UserRole.Customer) throw new BusinessException(ErrorCodes.Forbidden);

        if (requestedGateway != gateway.Gateway)
            throw new BusinessException(ErrorCodes.ValidationError, "Cổng thanh toán không được hỗ trợ.");

        var found = await payments.FindWithOwnerAsync(paymentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        OwnershipGuard.EnsureOwner(user, found.OwnerUserId);
        found.Payment.EnsureCanStartOnline(found.AppointmentStatus);

        var txnId = Guid.NewGuid();
        var transaction = new PaymentTransaction
        {
            TxnId = txnId,
            PaymentId = found.Payment.PaymentId,
            Gateway = gateway.Gateway,
            TxnRef = txnId.ToString("N"),
            RequestedAmount = found.Payment.Amount,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var paymentUrl = gateway.CreatePaymentUrl(transaction, clientIp);
        await payments.AddTransactionAsync(transaction, ct);

        return new OnlinePaymentStart(paymentUrl, transaction.TxnRef);
    }

    public bool VerifyIpnSignature(IReadOnlyDictionary<string, string> parameters)
    {
        return gateway.VerifyCallbackSignature(parameters);
    }
}
