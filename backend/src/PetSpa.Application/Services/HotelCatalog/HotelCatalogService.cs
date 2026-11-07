using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services;

public sealed class HotelCatalogService(IHotelCatalogRepository repository)
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

    public async Task SetLodgingPricesAsync(IReadOnlyList<LodgingPriceInput> prices, CancellationToken ct = default)
    {
        if (prices.Any(p => p.PricePerNight < 0))
            throw new BusinessException(ErrorCodes.ValidationError, "Giá lưu trú mỗi đêm không được âm.");

        if (prices.GroupBy(p => (p.Species, p.SizeGroup)).Any(g => g.Count() > 1))
            throw new BusinessException(
                ErrorCodes.ValidationError, "Mỗi cặp loài và nhóm kích cỡ chỉ được có một dòng giá.");

        var rows = prices
            .Select(p => new HotelPricing
            {
                Species = p.Species,
                SizeGroup = p.SizeGroup,
                PricePerNight = p.PricePerNight,
            })
            .ToList();

        await repository.SetLodgingPricesAsync(rows, ct);
    }
}

