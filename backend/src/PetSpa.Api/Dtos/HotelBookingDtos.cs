using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed class HotelAvailabilityQuery
{
    public DateTimeOffset? From { get; init; }
    public DateTimeOffset? To { get; init; }
    public Guid? PetId { get; init; }
}

public sealed record HotelAvailabilityResponse(bool Available, int Nights, long EstimatedAmount)
{
    public static HotelAvailabilityResponse From(HotelAvailabilityResult result) =>
        new(result.Available, result.Nights, (long)result.EstimatedAmount);
}

public sealed record HotelBookingRequest(
    Guid? PetId,
    DateTimeOffset? PlannedCheckIn,
    DateTimeOffset? PlannedCheckOut,
    Guid? CustomerId);

public sealed record HotelBookingResponse(Guid AppointmentId, AppointmentStatus Status, int Nights, long EstimatedAmount)
{
    public static HotelBookingResponse From(HotelBookingResult result) => new(
        result.Appointment.AppointmentId,
        result.Appointment.Status,
        result.Nights,
        (long)result.EstimatedAmount);
}

