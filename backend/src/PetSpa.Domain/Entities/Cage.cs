using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Entities;

public class Cage
{
    public Guid CageId { get; set; }
    public string Code { get; set; } = string.Empty;
    public Species Species { get; set; }
    public SizeGroup SizeGroup { get; set; }
    public bool IsActive { get; set; } = true;
}

