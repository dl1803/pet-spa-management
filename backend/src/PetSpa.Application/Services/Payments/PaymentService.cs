using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Payments;

public sealed record OnlinePaymentStart(string PaymentUrl, string TxnRef);

public enum PaymentCallbackStatus
{
    Paid,
    Failed,
    AlreadyProcessed,
    TxnNotFound,
    AmountMismatch,
    Malformed,
}

public sealed record PaymentCallbackResult(
    PaymentCallbackStatus Status,
    string? TxnRef = null,
    Guid? PaymentId = null,
    decimal? ExpectedAmount = null,
    decimal? ConfirmedAmount = null);

public sealed class PaymentService(
    IPaymentRepository payments,
    IPaymentGateway gateway,
    IConcurrencyGuard concurrency,
    IStaffRoleReader staffRoles,
    ICostConfirmationRepository costConfirmations,
    AppointmentQueryService appointmentQueries = null!)
{
    /// <summary>
    /// Constructor overload phục vụ kiểm thử cho các luồng thanh toán trực tuyến không dùng tới quầy.
    /// </summary>
    public PaymentService(
        IPaymentRepository payments,
        IPaymentGateway gateway,
        IConcurrencyGuard concurrency)
        : this(payments, gateway, concurrency, null!, null!)
    {
    }

    public async Task<PaymentStatus> RecordCounterAsync(
        CurrentUser user,
        Guid paymentId,
        PaymentMethod method,
        decimal receivedAmount,
        CancellationToken ct = default)
    {
        if (staffRoles is null || costConfirmations is null)
            throw new InvalidOperationException("PaymentService cần được khởi tạo với IStaffRoleReader và ICostConfirmationRepository để thực hiện ghi nhận thanh toán tại quầy.");

        await EnsureReceptionistOrManagerAsync(user, ct);

        if (method is not (PaymentMethod.Cash or PaymentMethod.BankQR))
            throw new BusinessException(ErrorCodes.ValidationError, "Thanh toán tại quầy chỉ nhận Cash hoặc BankQR.");

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockPaymentAsync(paymentId, ct);

            var target = await payments.FindForUpdateAsync(paymentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);
            var payment = target.Payment;

            await concurrency.LockAppointmentAsync(payment.AppointmentId, ct);

            if (payment.Kind == PaymentKind.Stay
                && await costConfirmations.HasPendingAsync(payment.AppointmentId, ct))
            {
                throw new BusinessException(ErrorCodes.CostConfirmationPending);
            }

            payment.MarkPaid(target.AppointmentStatus, receivedAmount, method, user.UserId);
            await payments.SaveChangesAsync(ct);

            return payment.Status;
        }, ct);
    }

    public async Task<IReadOnlyList<Payment>> ListByAppointmentAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        await appointmentQueries.GetAsync(user, appointmentId, ct);

        return await payments.ListByAppointmentAsync(appointmentId, ct);
    }

    public async Task<PagedResult<Payment>> ListAsync(
        CurrentUser user, PaymentStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        if (user.Role != UserRole.Manager)
            throw new BusinessException(ErrorCodes.Forbidden);

        return await payments.ListAsync(status, page, pageSize, ct);
    }

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

    public async Task<PaymentCallbackResult> ProcessCallbackAsync(
        IReadOnlyDictionary<string, string> parameters, CancellationToken ct = default)
    {
        var callback = gateway.ReadCallback(parameters);
        if (callback is null) return new PaymentCallbackResult(PaymentCallbackStatus.Malformed);

        var paymentId = await payments.FindPaymentIdByTxnRefAsync(callback.TxnRef, ct);
        if (paymentId is null)
            return new PaymentCallbackResult(PaymentCallbackStatus.TxnNotFound, callback.TxnRef);

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockPaymentAsync(paymentId.Value, ct);

            var target = await payments.FindCallbackTargetAsync(callback.TxnRef, ct);
            if (target is null)
                return new PaymentCallbackResult(PaymentCallbackStatus.TxnNotFound, callback.TxnRef);

            var (transaction, payment, appointmentStatus) = target;

            if (transaction.Result == TransactionResult.Success)
                return Outcome(PaymentCallbackStatus.AlreadyProcessed, transaction, payment, callback);

            if (!callback.Succeeded)
            {
                if (transaction.Result != TransactionResult.Failed)
                {
                    RecordCallback(transaction, callback, TransactionResult.Failed);
                    await payments.SaveChangesAsync(ct);
                }

                return Outcome(PaymentCallbackStatus.Failed, transaction, payment, callback);
            }

            try
            {
                payment.MarkPaid(appointmentStatus, callback.ConfirmedAmount, PaymentMethod.Online);
            }
            catch (BusinessException ex) when (ex.Code == ErrorCodes.AmountMismatch)
            {
                return Outcome(PaymentCallbackStatus.AmountMismatch, transaction, payment, callback);
            }
            catch (BusinessException ex) when (ex.Code == ErrorCodes.PaymentNotDue)
            {
                return Outcome(PaymentCallbackStatus.AlreadyProcessed, transaction, payment, callback);
            }

            RecordCallback(transaction, callback, TransactionResult.Success);
            await payments.SaveChangesAsync(ct);
            return Outcome(PaymentCallbackStatus.Paid, transaction, payment, callback);
        }, ct);
    }

    private async Task EnsureReceptionistOrManagerAsync(CurrentUser user, CancellationToken ct)
    {
        if (user.Role == UserRole.Manager)
            return;

        if (user.Role == UserRole.Staff
            && await staffRoles.GetStaffRoleAsync(user.UserId, ct) == StaffRole.Receptionist)
        {
            return;
        }

        throw new BusinessException(ErrorCodes.Forbidden);
    }

    private static void RecordCallback(
        PaymentTransaction transaction, GatewayCallback callback, TransactionResult result)
    {
        transaction.Result = result;
        transaction.ConfirmedAmount = callback.ConfirmedAmount;
        transaction.SignatureValid = true;
        transaction.CallbackAt = DateTimeOffset.UtcNow;
    }

    private static PaymentCallbackResult Outcome(
        PaymentCallbackStatus status, PaymentTransaction transaction, Payment payment, GatewayCallback callback) =>
        new(status, transaction.TxnRef, payment.PaymentId, payment.Amount, callback.ConfirmedAmount);
}
