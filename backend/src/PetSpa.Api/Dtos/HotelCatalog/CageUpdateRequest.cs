using PetSpa.Application.Services;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record CageUpdateRequest(string? Code, Species? Species, SizeGroup? SizeGroup)
{
    public CageUpdateInput ToInput() => new(Code, Species, SizeGroup);
}

