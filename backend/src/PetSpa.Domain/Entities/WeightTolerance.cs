using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Entities;

public class WeightTolerance
{
    public Species Species { get; set; }
    public SizeGroup FromGroup { get; set; }
    public SizeGroup ToGroup { get; set; }
    public decimal ToleranceKg { get; set; }
}

