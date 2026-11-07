using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public interface IHotelCatalogRepository
{
    Task AddCageAsync(Cage cage, CancellationToken ct = default);

    Task<bool> UpdateCageAsync(
        Guid cageId, string? code, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default);

    Task<bool> SetCageActiveAsync(Guid cageId, bool isActive, CancellationToken ct = default);

    Task<IReadOnlyList<HotelPricing>> ListPricingAsync(CancellationToken ct = default);

    Task SetLodgingPricesAsync(IReadOnlyList<HotelPricing> prices, CancellationToken ct = default);
}

