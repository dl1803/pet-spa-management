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

    private static readonly List<HotelPricing> HotelPrices =
    [
        new() { Species = Species.Dog, SizeGroup = SizeGroup.Small, PricePerNight = 150_000m, FoodPerNight = 30_000m },
        new() { Species = Species.Cat, SizeGroup = SizeGroup.Small, PricePerNight = 100_000m, FoodPerNight = 20_000m },
    ];

    private const decimal FeePerBlock = 50_000m;

    private static readonly DateTimeOffset PlannedCheckOut = new(2026, 11, 12, 12, 0, 0, TimeSpan.FromHours(7));

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

    [Fact]
    public void SpaAmount_SumsPricesOfAllServicesByGivenSizeGroup()
    {
        var amount = PricingService.SpaAmount(
            Species.Dog, SizeGroup.Medium, new[] { BathId, TrimId }, ServicePrices);

        Assert.Equal(270_000m, amount);
    }

    [Fact]
    public void SpaAmount_IgnoresPricesOfOtherSpecies()
    {
        var amount = PricingService.SpaAmount(
            Species.Cat, SizeGroup.Small, new[] { BathId }, ServicePrices);

        Assert.Equal(90_000m, amount);
    }

    [Fact]
    public void SpaAmount_WhenPriceMissing_ThrowsInvalidOperationException()
    {
        Assert.Throws<InvalidOperationException>(() =>
            PricingService.SpaAmount(
                Species.Dog, SizeGroup.Large, new[] { BathId }, ServicePrices));
    }

    [Fact]
    public void StayAmount_MultipliesNightsByPriceAndFood()
    {
        var amount = PricingService.StayAmount(
            Species.Dog, SizeGroup.Small, new DateOnly(2026, 11, 10), new DateOnly(2026, 11, 13), HotelPrices);

        Assert.Equal(540_000m, amount);
    }

    [Fact]
    public void StayAmount_CountsNightsAcrossMonthBoundary()
    {
        var amount = PricingService.StayAmount(
            Species.Dog, SizeGroup.Small, new DateOnly(2026, 11, 30), new DateOnly(2026, 12, 2), HotelPrices);

        Assert.Equal(360_000m, amount);
    }

    [Fact]
    public void StayAmount_IgnoresPricesOfOtherSpecies()
    {
        var amount = PricingService.StayAmount(
            Species.Cat, SizeGroup.Small, new DateOnly(2026, 11, 10), new DateOnly(2026, 11, 12), HotelPrices);

        Assert.Equal(240_000m, amount);
    }

    [Fact]
    public void StayAmount_WhenPricingMissing_ThrowsInvalidOperationException()
    {
        Assert.Throws<InvalidOperationException>(() =>
            PricingService.StayAmount(
                Species.Dog, SizeGroup.Large, new DateOnly(2026, 11, 10), new DateOnly(2026, 11, 12), HotelPrices));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-5)]
    public void StayAmount_WhenCheckOutDateNotAfterCheckInDate_ThrowsArgumentException(int nightDelta)
    {
        var checkIn = new DateOnly(2026, 11, 10);
        var checkOut = checkIn.AddDays(nightDelta);

        var ex = Assert.Throws<ArgumentException>(() =>
            PricingService.StayAmount(Species.Dog, SizeGroup.Small, checkIn, checkOut, HotelPrices));

        Assert.Contains("sau ngày nhận phòng ít nhất 1 đêm", ex.Message);
    }

    [Fact]
    public void StayAmount_WhenPricingNull_ThrowsArgumentNullException()
    {
        Assert.Throws<ArgumentNullException>(() =>
            PricingService.StayAmount(
                Species.Dog,
                SizeGroup.Small,
                new DateOnly(2026, 11, 10),
                new DateOnly(2026, 11, 12),
                null!));
    }

    [Theory]
    [InlineData(-120, 0)]
    [InlineData(0, 0)]
    [InlineData(30, 0)]
    [InlineData(31, 1)]
    [InlineData(90, 1)]
    [InlineData(91, 2)]
    [InlineData(150, 2)]
    [InlineData(151, 3)]
    public void LateFee_FollowsGraceAndBlockRule(int minutesLate, int expectedBlocks)
    {
        var actualCheckOut = PlannedCheckOut.AddMinutes(minutesLate);

        var fee = PricingService.LateFee(PlannedCheckOut, actualCheckOut, 30, 60, FeePerBlock);

        Assert.Equal(expectedBlocks * FeePerBlock, fee);
    }

    [Fact]
    public void LateFee_ChargesWhenLateExceedsGraceBySeconds()
    {
        var actualCheckOut = PlannedCheckOut.AddMinutes(30).AddSeconds(30);

        var fee = PricingService.LateFee(PlannedCheckOut, actualCheckOut, 30, 60, FeePerBlock);

        Assert.Equal(FeePerBlock, fee);
    }

    [Theory]
    [InlineData(15, 0)]
    [InlineData(16, 1)]
    [InlineData(45, 1)]
    [InlineData(46, 2)]
    public void LateFee_UsesGivenGraceAndBlockMinutes(int minutesLate, int expectedBlocks)
    {
        var actualCheckOut = PlannedCheckOut.AddMinutes(minutesLate);

        var fee = PricingService.LateFee(PlannedCheckOut, actualCheckOut, 15, 30, FeePerBlock);

        Assert.Equal(expectedBlocks * FeePerBlock, fee);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-60)]
    public void LateFee_WhenBlockMinutesZeroOrNegative_ThrowsArgumentOutOfRangeException(int blockMinutes)
    {
        var actual = PlannedCheckOut.AddMinutes(45);

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            PricingService.LateFee(PlannedCheckOut, actual, 30, blockMinutes, FeePerBlock));
    }

    [Fact]
    public void LateFee_WhenGraceMinutesNegative_ThrowsArgumentOutOfRangeException()
    {
        var actual = PlannedCheckOut.AddMinutes(45);

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            PricingService.LateFee(PlannedCheckOut, actual, -1, 60, FeePerBlock));
    }

    [Fact]
    public void LateFee_WhenFeePerBlockNegative_ThrowsArgumentOutOfRangeException()
    {
        var actual = PlannedCheckOut.AddMinutes(45);

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            PricingService.LateFee(PlannedCheckOut, actual, 30, 60, -10_000m));
    }
}
