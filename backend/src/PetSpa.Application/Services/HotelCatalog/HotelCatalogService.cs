using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services;

public sealed class HotelCatalogService(
    IHotelCatalogRepository repository, IServiceCatalogRepository serviceCatalog)
{
    public async Task<Guid> CreateCageAsync(CageInput input, CancellationToken ct = default)
    {
        var cage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = input.Code.Trim(),
            Species = input.Species,
            SizeGroup = input.SizeGroup,
        };

        await repository.AddCageAsync(cage, ct);
        return cage.CageId;
    }

    public async Task UpdateCageAsync(Guid cageId, CageUpdateInput input, CancellationToken ct = default)
    {
        var updated = await repository.UpdateCageAsync(cageId, input.Code?.Trim(), input.Species, input.SizeGroup, ct);
        if (!updated) throw new BusinessException(ErrorCodes.NotFound);
    }

    public async Task SetCageActiveAsync(Guid cageId, bool isActive, CancellationToken ct = default)
    {
        if (!await repository.SetCageActiveAsync(cageId, isActive, ct))
            throw new BusinessException(ErrorCodes.NotFound);
    }

    public Task<IReadOnlyList<HotelPricing>> ListLodgingPricesAsync(CancellationToken ct = default) =>
        repository.ListPricingAsync(ct);

    public async Task<HotelPricingSnapshot> GetPricingAsync(CancellationToken ct = default)
    {
        var pricing = await repository.ListPricingAsync(ct);
        var lateFeePerBlock = await repository.GetLateFeePerBlockAsync(ct);

        return new HotelPricingSnapshot(pricing, lateFeePerBlock);
    }

    public async Task SetLodgingPricesAsync(
        IReadOnlyList<LodgingPriceInput> prices, decimal lateFeePerBlock, CancellationToken ct = default)
    {
        if (lateFeePerBlock < 0)
            throw new BusinessException(ErrorCodes.ValidationError, "Phí phạt trả muộn mỗi lần không được âm.");

        if (prices.Any(p => p.PricePerNight < 0))
            throw new BusinessException(ErrorCodes.ValidationError, "Giá lưu trú mỗi đêm không được âm.");

        if (prices.Any(p => p.FoodPerNight < 0))
            throw new BusinessException(ErrorCodes.ValidationError, "Giá thức ăn mỗi đêm không được âm.");

        if (prices.GroupBy(p => (p.Species, p.SizeGroup)).Any(g => g.Count() > 1))
            throw new BusinessException(
                ErrorCodes.ValidationError, "Mỗi cặp loài và nhóm kích cỡ chỉ được có một dòng giá.");

        var sizeRules = await serviceCatalog.GetSizeRulesAsync(ct);
        foreach (var price in prices)
        {
            if (!GetSizeGroups(sizeRules, price.Species).Contains(price.SizeGroup))
                throw new BusinessException(
                    ErrorCodes.ValidationError,
                    $"Loài {price.Species} không có nhóm kích cỡ {price.SizeGroup}.");
        }

        var rows = prices
            .Select(p => new HotelPricing
            {
                Species = p.Species,
                SizeGroup = p.SizeGroup,
                PricePerNight = p.PricePerNight,
                FoodPerNight = p.FoodPerNight,
            })
            .ToList();

        await repository.SetLodgingPricesAsync(rows, lateFeePerBlock, ct);
    }

    private static List<SizeGroup> GetSizeGroups(IReadOnlyList<SizeRule> sizeRules, Species species)
    {
        var rulesOfSpecies = sizeRules.Where(r => r.Species == species).ToList();
        if (rulesOfSpecies.Count == 0)
        {
            return species == Species.GuineaPig
                ? [SizeGroup.Small, SizeGroup.Large]
                : [SizeGroup.Small, SizeGroup.Medium, SizeGroup.Large];
        }

        return rulesOfSpecies.Any(r => r.MediumUpper is null)
            ? [SizeGroup.Small, SizeGroup.Large]
            : [SizeGroup.Small, SizeGroup.Medium, SizeGroup.Large];
    }
}
