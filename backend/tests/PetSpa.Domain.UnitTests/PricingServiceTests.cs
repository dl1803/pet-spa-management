using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class PricingServiceTests
{
    private static readonly Guid BathId = Guid.NewGuid();
    private static readonly Guid TrimId = Guid.NewGuid();

    private static readonly List<ServicePricing> ServicePrices =
    [
        new() { ServiceId = BathId, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 100_000m },
        new() { ServiceId = BathId, Species = Species.Dog, SizeGroup = SizeGroup.Medium, Price = 150_000m },
        new() { ServiceId = TrimId, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 80_000m },
        new() { ServiceId = TrimId, Species = Species.Dog, SizeGroup = SizeGroup.Medium, Price = 120_000m },
        new() { ServiceId = BathId, Species = Species.Cat, SizeGroup = SizeGroup.Small, Price = 90_000m },
    ];

    [Fact]
    public void SpaServicePrices_UsesPriceOfGivenSizeGroup()
    {
        var prices = PricingService.SpaServicePrices(
            Species.Dog, SizeGroup.Medium, new[] { BathId }, ServicePrices);

        Assert.Equal(new SpaServicePrice(BathId, 150_000m), Assert.Single(prices));
    }

    [Fact]
    public void SpaServicePrices_IgnoresPricesOfOtherSpecies()
    {
        var prices = PricingService.SpaServicePrices(
            Species.Cat, SizeGroup.Small, new[] { BathId }, ServicePrices);

        Assert.Equal(new SpaServicePrice(BathId, 90_000m), Assert.Single(prices));
    }

    [Fact]
    public void SpaServicePrices_ReturnsOnePricePerServiceInGivenOrder()
    {
        var prices = PricingService.SpaServicePrices(
            Species.Dog, SizeGroup.Small, new[] { TrimId, BathId }, ServicePrices);

        Assert.Equal(
            new[] { new SpaServicePrice(TrimId, 80_000m), new SpaServicePrice(BathId, 100_000m) },
            prices);
    }

    [Fact]
    public void SpaServicePrices_WhenPriceMissing_ThrowsInvalidOperationException()
    {
        Assert.Throws<InvalidOperationException>(() =>
            PricingService.SpaServicePrices(
                Species.Dog, SizeGroup.Large, new[] { BathId }, ServicePrices));
    }
}

