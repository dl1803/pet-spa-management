using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Entities;

public class ServicePricing
{
    public Guid ServiceId { get; set; }
    public Species Species { get; set; }
    public SizeGroup SizeGroup { get; set; }
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; }
    public short StaffRequired { get; set; } = 1;
}

