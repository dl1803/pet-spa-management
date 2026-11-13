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
}
