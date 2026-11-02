using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services.Pets;

public sealed record PetInput(
    string Name,
    Species Species,
    string Breed,
    Temperament? Temperament,
    decimal WeightKg,
    decimal? HeightCm,
    string? CoatNote,
    string? Notes);

