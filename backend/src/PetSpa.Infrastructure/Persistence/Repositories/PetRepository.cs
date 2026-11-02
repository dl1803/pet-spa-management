using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class PetRepository(AppDbContext db) : IPetRepository
{
    public Task<Guid?> FindCustomerIdByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        db.Set<Customer>()
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .Select(c => (Guid?)c.CustomerId)
            .FirstOrDefaultAsync(ct);

    public Task<bool> CustomerExistsAsync(Guid customerId, CancellationToken ct = default) =>
        db.Set<Customer>().AnyAsync(c => c.CustomerId == customerId, ct);

    public async Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(Species species, CancellationToken ct = default) =>
        await db.Set<SizeRule>()
            .AsNoTracking()
            .Where(r => r.Species == species)
            .ToListAsync(ct);

    public async Task<PetWithOwner?> FindWithOwnerAsync(Guid petId, CancellationToken ct = default)
    {
        var row = await (
            from pet in db.Set<Pet>()
            join customer in db.Set<Customer>() on pet.CustomerId equals customer.CustomerId
            where pet.PetId == petId
            select new { Pet = pet, OwnerUserId = customer.UserId })
            .FirstOrDefaultAsync(ct);

        return row is null ? null : new PetWithOwner(row.Pet, row.OwnerUserId);
    }

    public async Task<(IReadOnlyList<Pet> Items, int Total)> ListActiveByCustomerAsync(
        Guid customerId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.Set<Pet>()
            .AsNoTracking()
            .Where(p => p.CustomerId == customerId && p.IsActive);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(p => p.CreatedAt)
            .ThenBy(p => p.PetId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public Task<bool> IsAssignedToStaffAsync(Guid petId, Guid staffUserId, CancellationToken ct = default) =>
        (from assignment in db.Set<AppointmentStaff>()
         join appointment in db.Set<Appointment>() on assignment.AppointmentId equals appointment.AppointmentId
         join staff in db.Set<Staff>() on assignment.StaffId equals staff.StaffId
         where appointment.PetId == petId && staff.UserId == staffUserId
         select assignment.AppointmentId)
        .AnyAsync(ct);

    public Task<bool> HasAppointmentsAsync(Guid petId, CancellationToken ct = default) =>
        db.Set<Appointment>().AnyAsync(a => a.PetId == petId, ct);

    public void Add(Pet pet) => db.Set<Pet>().Add(pet);

    public void Remove(Pet pet) => db.Set<Pet>().Remove(pet);

    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}
