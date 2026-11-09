using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record SpaBookingRequest(
    Guid? PetId,
    List<Guid>? ServiceIds,
    DateTimeOffset? SlotStart,
    Guid? CustomerId);

public sealed record SpaBookingResponse(
    Guid AppointmentId,
    string Type,
    AppointmentStatus Status,
    SizeGroup SizeGroup,
    DateTimeOffset SlotStart,
    DateTimeOffset SlotEnd,
    int StaffRequired,
    long EstimatedAmount)
{
    public static SpaBookingResponse From(SpaBookingResult result) => new(
        result.Appointment.AppointmentId,
        "Spa",
        result.Appointment.Status,
        result.Appointment.SizeGroup,
        result.Appointment.SlotStart,
        result.Appointment.SlotEnd,
        result.Appointment.StaffRequired,
        (long)result.EstimatedAmount);
}

