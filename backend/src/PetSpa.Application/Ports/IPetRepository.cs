using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record PetWithOwner(Pet Pet, Guid? OwnerUserId);

public interface IPetRepository
{
    Task<Guid?> FindCustomerIdByUserIdAsync(Guid userId, CancellationToken ct = default);

    Task<bool> CustomerExistsAsync(Guid customerId, CancellationToken ct = default);

    Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(Species species, CancellationToken ct = default);

    Task<PetWithOwner?> FindWithOwnerAsync(Guid petId, CancellationToken ct = default);

    Task<(IReadOnlyList<Pet> Items, int Total)> ListActiveByCustomerAsync(Guid customerId, int page, int pageSize, CancellationToken ct = default);

    Task<bool> IsAssignedToStaffAsync(Guid petId, Guid staffUserId, CancellationToken ct = default);

    Task<bool> HasAppointmentsAsync(Guid petId, CancellationToken ct = default);

    void Add(Pet pet);

    void Remove(Pet pet);

    Task SaveChangesAsync(CancellationToken ct = default);
}
