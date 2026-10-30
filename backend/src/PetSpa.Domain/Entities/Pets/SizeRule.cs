using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Entities;

public class SizeRule
{
    public Species Species { get; set; }
    public SizeCriterion Criterion { get; set; }
    public decimal SmallUpper { get; set; }
    public decimal? MediumUpper { get; set; }
}

