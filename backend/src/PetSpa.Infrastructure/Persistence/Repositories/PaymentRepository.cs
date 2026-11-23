using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

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

    public async Task<PaymentForUpdate?> FindForUpdateAsync(Guid paymentId, CancellationToken ct = default)
    {
        var row = await (
            from p in db.Set<Payment>()
            join a in db.Set<Appointment>() on p.AppointmentId equals a.AppointmentId
            where p.PaymentId == paymentId
            select new { Payment = p, a.Status })
            .FirstOrDefaultAsync(ct);

        return row is null ? null : new PaymentForUpdate(row.Payment, row.Status);
    }

    public async Task<IReadOnlyList<Payment>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var items = await db.Set<Payment>()
            .AsNoTracking()
            .Where(p => p.AppointmentId == appointmentId)
            .ToListAsync(ct);

        return items.OrderBy(p => p.Kind).ToList();
    }

    public async Task<PagedResult<Payment>> ListAsync(
        PaymentStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        var payments = db.Set<Payment>().AsNoTracking();
        if (status is { } wantedStatus)
            payments = payments.Where(p => p.Status == wantedStatus);

        var query =
            from p in payments
            join a in db.Set<Appointment>().AsNoTracking() on p.AppointmentId equals a.AppointmentId
            orderby a.CreatedAt descending, p.PaymentId
            select p;

        var total = await query.CountAsync(ct);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new PagedResult<Payment>(items, page, pageSize, total);
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
