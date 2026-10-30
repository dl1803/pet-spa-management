using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Entities;

public class HotelPricing
{
    public Species Species { get; set; }
    public SizeGroup SizeGroup { get; set; }
    public decimal PricePerNight { get; set; }
    public decimal FoodPerNight { get; set; }
}

