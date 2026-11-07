using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services;

public sealed record LodgingPriceInput(Species Species, SizeGroup SizeGroup, decimal PricePerNight);

