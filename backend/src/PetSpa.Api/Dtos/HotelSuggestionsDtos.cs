using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record SuggestedCageResponse(Guid CageId, string Code, Species Species, SizeGroup SizeGroup, bool IsActive)
{
    public static SuggestedCageResponse From(Cage cage) =>
        new(cage.CageId, cage.Code, cage.Species, cage.SizeGroup, cage.IsActive);
}

public sealed record HotelSuggestionsResponse(SuggestedCageResponse? Cage)
{
    public static HotelSuggestionsResponse From(HotelCageSuggestionResult result) =>
        new(result.Cage is null ? null : SuggestedCageResponse.From(result.Cage));
}

