using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record PetRequest(
    string? Name,
    Species? Species,
    string? Breed,
    Temperament? Temperament,
    decimal? WeightKg,
    decimal? HeightCm,
    string? CoatNote,
    string? Notes,
    Guid? CustomerId);

