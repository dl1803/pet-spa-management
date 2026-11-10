using PetSpa.Application.Services;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record HotelPricingRowRequest(Species? Species, SizeGroup? SizeGroup, long? PricePerNight, long? FoodPerNight);

public sealed record HotelPricingRequest(IReadOnlyList<HotelPricingRowRequest> Pricing, long? LateFeePerBlock)
{
    public IReadOnlyList<LodgingPriceInput> ToPriceInputs() =>
        Pricing is null
            ? []
            : Pricing
                .Where(p => p.Species.HasValue && p.SizeGroup.HasValue && p.PricePerNight.HasValue && p.FoodPerNight.HasValue)
                .Select(p => new LodgingPriceInput(
                    p.Species!.Value,
                    p.SizeGroup!.Value,
                    p.PricePerNight!.Value,
                    p.FoodPerNight!.Value))
                .ToList();
}

