using PetSpa.Domain.Enums;

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
}

