using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class PaymentRepository(AppDbContext db) : IPaymentRepository
{
    public async Task<PaymentWithOwner?> FindWithOwnerAsync(Guid paymentId, CancellationToken ct = default)
    {
        var row = await (
            from p in db.Set<Payment>().AsNoTracking()
            join a in db.Set<Appointment>() on p.AppointmentId equals a.AppointmentId
            join c in db.Set<Customer>() on a.CustomerId equals c.CustomerId
            where p.PaymentId == paymentId
            select new { Payment = p, a.Status, OwnerUserId = c.UserId })
            .FirstOrDefaultAsync(ct);

        return row is null ? null : new PaymentWithOwner(row.Payment, row.Status, row.OwnerUserId);
    }

    public async Task AddTransactionAsync(PaymentTransaction transaction, CancellationToken ct = default)
    {
        db.Set<PaymentTransaction>().Add(transaction);
        await db.SaveChangesAsync(ct);
    }

    public Task<Guid?> FindPaymentIdByTxnRefAsync(string txnRef, CancellationToken ct = default) =>
        db.Set<PaymentTransaction>().AsNoTracking()
            .Where(t => t.TxnRef == txnRef)
            .Select(t => (Guid?)t.PaymentId)
            .FirstOrDefaultAsync(ct);

    public async Task<PaymentCallbackTarget?> FindCallbackTargetAsync(string txnRef, CancellationToken ct = default)
    {
        var row = await (
            from t in db.Set<PaymentTransaction>()
            join p in db.Set<Payment>() on t.PaymentId equals p.PaymentId
            join a in db.Set<Appointment>() on p.AppointmentId equals a.AppointmentId
            where t.TxnRef == txnRef
            select new { Transaction = t, Payment = p, a.Status })
            .FirstOrDefaultAsync(ct);

        return row is null ? null : new PaymentCallbackTarget(row.Transaction, row.Payment, row.Status);
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}
