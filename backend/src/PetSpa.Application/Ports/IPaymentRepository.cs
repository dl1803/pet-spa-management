using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record PaymentWithOwner(Payment Payment, AppointmentStatus AppointmentStatus, Guid? OwnerUserId);

public interface IPaymentRepository
{
    Task<PaymentWithOwner?> FindWithOwnerAsync(Guid paymentId, CancellationToken ct = default);

    Task AddTransactionAsync(PaymentTransaction transaction, CancellationToken ct = default);
}
