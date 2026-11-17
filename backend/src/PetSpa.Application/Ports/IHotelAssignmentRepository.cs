using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record HotelStayForAssignment(
    Guid AppointmentId,
    AppointmentStatus Status,
    Species Species,
    SizeGroup SizeGroup,
    DateTimeOffset PlannedCheckIn,
    DateTimeOffset PlannedCheckOut);

public sealed record CageStayWindow(Guid CageId, DateTimeOffset PlannedCheckIn, DateTimeOffset PlannedCheckOut);

public interface IHotelAssignmentRepository
{
    Task<HotelStayForAssignment?> FindHotelStayAsync(Guid appointmentId, CancellationToken ct = default);

    Task<IReadOnlyList<Cage>> ListCagesAsync(CancellationToken ct = default);

    Task<IReadOnlyList<CageStayWindow>> ListCageStayWindowsAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default);
}

