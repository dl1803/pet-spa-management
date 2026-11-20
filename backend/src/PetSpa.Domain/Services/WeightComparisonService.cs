using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Services;

public sealed record WeightComparison(WeightCheckResult Result, SizeGroup NewSizeGroup);

public static class WeightComparisonService
{
    public static WeightComparison Compare(
        Pet pet,
        SizeGroup currentGroup,
        decimal actualWeightKg,
        IReadOnlyCollection<SizeRule> sizeRules,
        IReadOnlyCollection<WeightTolerance> tolerances)
    {
        var probe = new Pet { Species = pet.Species, WeightKg = actualWeightKg, HeightCm = pet.HeightCm };
        probe.DetermineSizeGroup(sizeRules);
        var newGroup = probe.SizeGroup;

        if (actualWeightKg < pet.WeightKg)
        {
            var lighter = newGroup < currentGroup ? WeightCheckResult.PRICE_DECREASED : WeightCheckResult.OK;
            return new WeightComparison(lighter, newGroup);
        }

        if (newGroup <= currentGroup)
        {
            return new WeightComparison(WeightCheckResult.OK, newGroup);
        }

        var tolerance = tolerances.FirstOrDefault(t => t.Species == pet.Species && t.ToGroup == newGroup)
            ?? throw new InvalidOperationException(
                $"Thiếu ngưỡng dung sai cân nặng của loài {pet.Species}, nhóm {newGroup} trong bảng WeightTolerance.");

        var heavier = actualWeightKg - pet.WeightKg <= tolerance.ToleranceKg
            ? WeightCheckResult.OK
            : WeightCheckResult.NEEDS_CONFIRMATION;

        return new WeightComparison(heavier, newGroup);
    }
}

