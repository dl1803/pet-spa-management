using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Domain.Entities;

public class Pet
{
    public Guid PetId { get; set; }
    public Guid CustomerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public Species Species { get; set; }
    public string Breed { get; set; } = string.Empty;
    public Temperament Temperament { get; set; } = Temperament.Normal;
    public decimal WeightKg { get; set; }
    public decimal? HeightCm { get; set; }
    public string? CoatNote { get; set; }
    public string? Notes { get; set; }
    public SizeGroup SizeGroup { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public void DetermineSizeGroup(IReadOnlyCollection<SizeRule> rules)
    {
        var group = Classify(WeightKg, FindRule(rules, SizeCriterion.Weight));

        if (Species == Species.Dog)
        {
            if (HeightCm is null)
                throw new BusinessException(ErrorCodes.ValidationError, "Chiều cao là bắt buộc đối với chó.");

            var heightGroup = Classify(HeightCm.Value, FindRule(rules, SizeCriterion.Height));
            if (heightGroup > group) group = heightGroup;
        }

        SizeGroup = group;
    }

    private SizeRule FindRule(IReadOnlyCollection<SizeRule> rules, SizeCriterion criterion) =>
        rules.FirstOrDefault(r => r.Species == Species && r.Criterion == criterion)
        ?? throw new InvalidOperationException($"Thiếu mốc phân nhóm kích cỡ {criterion} của loài {Species} trong bảng SizeRule.");

    private static SizeGroup Classify(decimal value, SizeRule rule)
    {
        if (value < rule.SmallUpper) return SizeGroup.Small;
        if (rule.MediumUpper is null || value >= rule.MediumUpper) return SizeGroup.Large;
        return SizeGroup.Medium;
    }
}
