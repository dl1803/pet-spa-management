using PetSpa.Application.Services;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record CageCreateRequest(string? Code, Species? Species, SizeGroup? SizeGroup)
{
    public CageInput ToInput() => new(Code!, Species!.Value, SizeGroup!.Value);
}

