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

    public void Add(Pet pet) => db.Set<Pet>().Add(pet);

    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}

