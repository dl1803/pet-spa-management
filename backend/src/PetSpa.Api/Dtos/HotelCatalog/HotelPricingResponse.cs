using PetSpa.Application.Services;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record HotelPricingRowResponse(Species Species, SizeGroup SizeGroup, long PricePerNight, long FoodPerNight);

public sealed record HotelPricingResponse(IReadOnlyList<HotelPricingRowResponse> Pricing, long LateFeePerBlock)
{
    public static HotelPricingResponse From(HotelPricingSnapshot snapshot) => new(
        snapshot.Pricing
            .Select(p => new HotelPricingRowResponse(p.Species, p.SizeGroup, (long)p.PricePerNight, (long)p.FoodPerNight))
            .ToList(),
        (long)snapshot.LateFeePerBlock);
}

