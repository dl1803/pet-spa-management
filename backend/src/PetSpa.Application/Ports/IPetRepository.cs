using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public interface IPetRepository
{
    Task<Guid?> FindCustomerIdByUserIdAsync(Guid userId, CancellationToken ct = default);

    Task<bool> CustomerExistsAsync(Guid customerId, CancellationToken ct = default);

    Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(Species species, CancellationToken ct = default);

    void Add(Pet pet);

    Task SaveChangesAsync(CancellationToken ct = default);
}

