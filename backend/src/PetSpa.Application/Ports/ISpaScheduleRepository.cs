using PetSpa.Domain.Entities;

namespace PetSpa.Application.Ports;

public sealed record StaffShiftWindow(Guid StaffId, DateTimeOffset ShiftStart, DateTimeOffset ShiftEnd);

public sealed record HeldSpaBooking(DateTimeOffset SlotStart, DateTimeOffset BusyUntil, short StaffRequired);

public interface ISpaScheduleRepository
{
    Task<int> GetBufferMinutesAsync(CancellationToken ct = default);

    Task<IReadOnlyList<StaffShiftWindow>> ListActiveSpaStaffShiftsAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default);

    Task<IReadOnlyList<HeldSpaBooking>> ListHeldSpaBookingsAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default);

    Task AddSpaAppointmentAsync(
        SpaAppointment appointment, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default);
}
