using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record PetCreatedResponse(Guid PetId, SizeGroup SizeGroup);

public sealed record PetResponse(
    Guid PetId,
    Guid CustomerId,
    string Name,
    Species Species,
    string Breed,
    Temperament Temperament,
    decimal WeightKg,
    decimal? HeightCm,
    string? CoatNote,
    string? Notes,
    SizeGroup SizeGroup,
    bool IsActive)
{
    public static PetResponse From(Pet pet) => new(
        pet.PetId,
        pet.CustomerId,
        pet.Name,
        pet.Species,
        pet.Breed,
        pet.Temperament,
        pet.WeightKg,
        pet.HeightCm,
        pet.CoatNote,
        pet.Notes,
        pet.SizeGroup,
        pet.IsActive);
}
