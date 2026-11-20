using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class WeightComparisonServiceTests
{
    private static readonly List<SizeRule> Rules =
    [
        new() { Species = Species.Dog, Criterion = SizeCriterion.Weight, SmallUpper = 10m, MediumUpper = 25m },
        new() { Species = Species.Dog, Criterion = SizeCriterion.Height, SmallUpper = 35m, MediumUpper = 55m },
        new() { Species = Species.Cat, Criterion = SizeCriterion.Weight, SmallUpper = 3m, MediumUpper = 5m },
        new() { Species = Species.Rabbit, Criterion = SizeCriterion.Weight, SmallUpper = 1.5m, MediumUpper = 3m },
        new() { Species = Species.GuineaPig, Criterion = SizeCriterion.Weight, SmallUpper = 1m, MediumUpper = null },
    ];

    private static readonly List<WeightTolerance> Tolerances =
    [
        new() { Species = Species.GuineaPig, FromGroup = SizeGroup.Small, ToGroup = SizeGroup.Large, ToleranceKg = 0.2m },
        new() { Species = Species.Rabbit, FromGroup = SizeGroup.Small, ToGroup = SizeGroup.Medium, ToleranceKg = 0.3m },
        new() { Species = Species.Rabbit, FromGroup = SizeGroup.Medium, ToGroup = SizeGroup.Large, ToleranceKg = 0.3m },
        new() { Species = Species.Cat, FromGroup = SizeGroup.Small, ToGroup = SizeGroup.Medium, ToleranceKg = 0.5m },
        new() { Species = Species.Cat, FromGroup = SizeGroup.Medium, ToGroup = SizeGroup.Large, ToleranceKg = 0.5m },
        new() { Species = Species.Dog, FromGroup = SizeGroup.Small, ToGroup = SizeGroup.Medium, ToleranceKg = 1.5m },
        new() { Species = Species.Dog, FromGroup = SizeGroup.Medium, ToGroup = SizeGroup.Large, ToleranceKg = 2.5m },
    ];

    private static Pet NewPet(Species species, double weight, double? height = null) => new()
    {
        Species = species,
        WeightKg = (decimal)weight,
        HeightCm = height is null ? null : (decimal)height.Value,
    };

    [Theory]
    [InlineData(2.8, 3.2, SizeGroup.Small, WeightCheckResult.OK, SizeGroup.Medium)]
    [InlineData(2.8, 3.3, SizeGroup.Small, WeightCheckResult.OK, SizeGroup.Medium)]
    [InlineData(2.8, 3.4, SizeGroup.Small, WeightCheckResult.NEEDS_CONFIRMATION, SizeGroup.Medium)]
    [InlineData(2.5, 2.9, SizeGroup.Small, WeightCheckResult.OK, SizeGroup.Small)]
    [InlineData(4.0, 4.0, SizeGroup.Medium, WeightCheckResult.OK, SizeGroup.Medium)]
    [InlineData(4.0, 3.5, SizeGroup.Medium, WeightCheckResult.OK, SizeGroup.Medium)]
    [InlineData(4.0, 2.9, SizeGroup.Medium, WeightCheckResult.PRICE_DECREASED, SizeGroup.Small)]
    [InlineData(4.8, 5.2, SizeGroup.Medium, WeightCheckResult.OK, SizeGroup.Large)]
    [InlineData(2.9, 5.2, SizeGroup.Small, WeightCheckResult.NEEDS_CONFIRMATION, SizeGroup.Large)]
    public void Cat_ComparesActualWeightWithProfile(
        double declared, double actual, SizeGroup current, WeightCheckResult expected, SizeGroup expectedNewGroup)
    {
        var result = WeightComparisonService.Compare(
            NewPet(Species.Cat, declared), current, (decimal)actual, Rules, Tolerances);

        Assert.Equal(expected, result.Result);
        Assert.Equal(expectedNewGroup, result.NewSizeGroup);
    }

    [Theory]
    [InlineData(0.9, 1.1, SizeGroup.Small, WeightCheckResult.OK, SizeGroup.Large)]
    [InlineData(0.9, 1.2, SizeGroup.Small, WeightCheckResult.NEEDS_CONFIRMATION, SizeGroup.Large)]
    [InlineData(1.2, 1.0, SizeGroup.Large, WeightCheckResult.OK, SizeGroup.Large)]
    [InlineData(1.2, 0.9, SizeGroup.Large, WeightCheckResult.PRICE_DECREASED, SizeGroup.Small)]
    public void GuineaPig_ComparesActualWeightWithProfile(
        double declared, double actual, SizeGroup current, WeightCheckResult expected, SizeGroup expectedNewGroup)
    {
        var result = WeightComparisonService.Compare(
            NewPet(Species.GuineaPig, declared), current, (decimal)actual, Rules, Tolerances);

        Assert.Equal(expected, result.Result);
        Assert.Equal(expectedNewGroup, result.NewSizeGroup);
    }

    [Theory]
    [InlineData(9.0, 30.0, SizeGroup.Small, 9.5, WeightCheckResult.OK, SizeGroup.Small)]
    [InlineData(9.0, 30.0, SizeGroup.Small, 30.0, WeightCheckResult.NEEDS_CONFIRMATION, SizeGroup.Large)]
    [InlineData(9.0, 40.0, SizeGroup.Medium, 12.0, WeightCheckResult.OK, SizeGroup.Medium)]
    [InlineData(8.0, 40.0, SizeGroup.Medium, 7.0, WeightCheckResult.OK, SizeGroup.Medium)]
    [InlineData(24.0, 40.0, SizeGroup.Medium, 26.5, WeightCheckResult.OK, SizeGroup.Large)]
    [InlineData(24.0, 40.0, SizeGroup.Medium, 26.51, WeightCheckResult.NEEDS_CONFIRMATION, SizeGroup.Large)]
    public void Dog_KeepsProfileHeightAndUsesHigherGroup(
        double declared, double height, SizeGroup current, double actual, WeightCheckResult expected, SizeGroup expectedNewGroup)
    {
        var result = WeightComparisonService.Compare(
            NewPet(Species.Dog, declared, height), current, (decimal)actual, Rules, Tolerances);

        Assert.Equal(expected, result.Result);
        Assert.Equal(expectedNewGroup, result.NewSizeGroup);
    }

    [Fact]
    public void Compare_WhenToleranceRowIsMissing_Throws()
    {
        var pet = NewPet(Species.Cat, 2.8);

        Assert.Throws<InvalidOperationException>(() =>
            WeightComparisonService.Compare(pet, SizeGroup.Small, 3.4m, Rules, []));
    }

    [Fact]
    public void RecordWeight_SetsActualWeightAndKeepsStatusAndSizeGroup()
    {
        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Received,
            SizeGroup = SizeGroup.Small,
        };

        appointment.RecordWeight(3.4m);

        Assert.Equal(3.4m, appointment.ActualWeightKg);
        Assert.Equal(AppointmentStatus.Received, appointment.Status);
        Assert.Equal(SizeGroup.Small, appointment.SizeGroup);
    }
}

