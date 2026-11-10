using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

// GET /appointments?type=&status=&page=&pageSize=
public sealed class ListAppointmentsQuery
{
    public AppointmentType? Type { get; init; }
    public AppointmentStatus? Status { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

// Một lịch hẹn trong danh sách (khớp schema Appointment trong openapi).
// Trường chỉ có ở lịch spa hoặc chỉ có ở lịch lưu trú là null khi không áp dụng.
public record AppointmentResponse(
    Guid AppointmentId,
    AppointmentType Type,
    Guid CustomerId,
    Guid PetId,
    string PetName,
    AppointmentStatus Status,
    CancelReason? CancelReason,
    DateTimeOffset? CancelledAt,
    SizeGroup SizeGroup,
    decimal? ActualWeightKg,
    DateTimeOffset? SlotStart,
    DateTimeOffset? SlotEnd,
    int? StaffRequired,
    DateTimeOffset? PlannedCheckIn,
    DateTimeOffset? PlannedCheckOut,
    DateTimeOffset? ActualCheckOut,
    Guid? CageId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    public static AppointmentResponse From(Appointment appointment, string petName)
    {
        var spa = appointment as SpaAppointment;
        var hotel = appointment as HotelAppointment;

        return new AppointmentResponse(
            appointment.AppointmentId,
            spa is not null ? AppointmentType.Spa : AppointmentType.Hotel,
            appointment.CustomerId,
            appointment.PetId,
            petName,
            appointment.Status,
            appointment.CancelReason,
            appointment.CancelledAt,
            appointment.SizeGroup,
            appointment.ActualWeightKg,
            spa?.SlotStart,
            spa?.SlotEnd,
            spa?.StaffRequired,
            hotel?.PlannedCheckIn,
            hotel?.PlannedCheckOut,
            hotel?.ActualCheckOut,
            hotel?.CageId,
            appointment.CreatedAt,
            appointment.UpdatedAt);
    }
}

