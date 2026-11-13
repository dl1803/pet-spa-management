using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Services;

namespace PetSpa.Api.Dtos;

public sealed record StaffSuggestionResponse(Guid StaffId, string FullName, int RecentAssignmentCount)
{
    public static StaffSuggestionResponse From(SlotStaffSuggestion suggestion) =>
        new(suggestion.StaffId, suggestion.FullName, suggestion.RecentAssignmentCount);
}

public sealed record SpaSuggestionsResponse(
    int StaffRequired,
    IReadOnlyList<StaffSuggestionResponse> Suggested,
    IReadOnlyList<StaffSuggestionResponse> Alternatives)
{
    public static SpaSuggestionsResponse From(SpaStaffSuggestionsResult result) => new(
        result.StaffRequired,
        result.Suggested.Select(StaffSuggestionResponse.From).ToList(),
        result.Alternatives.Select(StaffSuggestionResponse.From).ToList());
}

