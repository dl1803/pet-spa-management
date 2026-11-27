using System.Text.Json.Serialization;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record CheckOutResponse(
    AppointmentStatus Status,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] long? LateFee)
{
    public static CheckOutResponse From(HotelCheckOutResult result) =>
        new(result.Status, (long?)result.LateFee);
}

