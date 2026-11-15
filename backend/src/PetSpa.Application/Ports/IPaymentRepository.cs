using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record PaymentWithOwner(Payment Payment, AppointmentStatus AppointmentStatus, Guid? OwnerUserId);

public sealed record PaymentCallbackTarget(
    PaymentTransaction Transaction, Payment Payment, AppointmentStatus AppointmentStatus);

public interface IPaymentRepository
{
    Task<PaymentWithOwner?> FindWithOwnerAsync(Guid paymentId, CancellationToken ct = default);

    Task AddTransactionAsync(PaymentTransaction transaction, CancellationToken ct = default);

    Task<Guid?> FindPaymentIdByTxnRefAsync(string txnRef, CancellationToken ct = default);

    Task<PaymentCallbackTarget?> FindCallbackTargetAsync(string txnRef, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
