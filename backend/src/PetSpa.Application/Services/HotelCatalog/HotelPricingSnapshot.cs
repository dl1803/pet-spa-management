using PetSpa.Domain.Entities;

namespace PetSpa.Application.Services;

public sealed record HotelPricingSnapshot(IReadOnlyList<HotelPricing> Pricing, decimal LateFeePerBlock);

