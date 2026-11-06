using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services;

public sealed record CageInput(string Code, Species Species, SizeGroup SizeGroup);

public sealed record CageUpdateInput(string? Code, Species? Species, SizeGroup? SizeGroup);

