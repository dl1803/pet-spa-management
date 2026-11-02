using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record ServiceWithPricing(Service Service, IReadOnlyList<ServicePricing> Pricing);

public interface IServiceCatalogRepository
{
    Task<IReadOnlyList<ServiceWithPricing>> ListAsync(
        bool includeInactive, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default);

    Task AddAsync(Service service, IReadOnlyList<ServicePricing> pricing, CancellationToken ct = default);

    Task<IReadOnlyList<TimeOnly>> GetSlotTimesAsync(CancellationToken ct = default);

    Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(CancellationToken ct = default);

    Task<bool> UpdateAsync(Service service, IReadOnlyList<ServicePricing> pricing, CancellationToken ct = default);
}
