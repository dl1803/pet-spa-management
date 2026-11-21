using System.Text.Json.Serialization;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record ActualWeightRequest(decimal? ActualWeightKg);

public sealed record WeightCheckDetailResponse(
    WeightCheckResult Result,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] SizeGroup? NewSizeGroup,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] long? OldAmount,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] long? NewAmount,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] DateTimeOffset? ExpiresAt)
{
    public static WeightCheckDetailResponse From(WeightCheckOutcome outcome) =>
        new(outcome.Result, outcome.NewSizeGroup, (long?)outcome.OldAmount, (long?)outcome.NewAmount, outcome.ExpiresAt);
}

public sealed record WeightCheckResponse(WeightCheckDetailResponse WeightCheck)
{
    public static WeightCheckResponse From(WeightCheckOutcome outcome) =>
        new(WeightCheckDetailResponse.From(outcome));
}

public sealed record CheckInResponse(AppointmentStatus Status, WeightCheckDetailResponse WeightCheck)
{
    public static CheckInResponse From(SpaCheckInResult result) =>
        new(result.Status, WeightCheckDetailResponse.From(result.WeightCheck));
}
