using PetSpa.Application.Common;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record PaymentWithOwner(Payment Payment, AppointmentStatus AppointmentStatus, Guid? OwnerUserId);

public sealed record PaymentForUpdate(Payment Payment, AppointmentStatus AppointmentStatus);

public sealed record PaymentCallbackTarget(
    PaymentTransaction Transaction, Payment Payment, AppointmentStatus AppointmentStatus);

public interface IPaymentRepository
{
    Task<PaymentWithOwner?> FindWithOwnerAsync(Guid paymentId, CancellationToken ct = default);

    Task<PaymentForUpdate?> FindForUpdateAsync(Guid paymentId, CancellationToken ct = default);

    Task<IReadOnlyList<Payment>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default);

    Task<PagedResult<Payment>> ListAsync(PaymentStatus? status, int page, int pageSize, CancellationToken ct = default);

    void Add(Payment payment);

    Task AddTransactionAsync(PaymentTransaction transaction, CancellationToken ct = default);

    Task<Guid?> FindPaymentIdByTxnRefAsync(string txnRef, CancellationToken ct = default);

    Task<PaymentCallbackTarget?> FindCallbackTargetAsync(string txnRef, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
