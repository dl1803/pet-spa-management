using System.Text.Json.Serialization;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record CostConfirmationRespondRequest(bool? Accept);

public sealed record CostConfirmationRespondResponse(
    AppointmentStatus Status,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] bool? CageSuitable)
{
    public static CostConfirmationRespondResponse From(CostConfirmationResult result) =>
        new(result.Status, result.CageSuitable);
}
