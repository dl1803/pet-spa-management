using PetSpa.Application.Ports;

namespace PetSpa.Application.Services.Booking;

public sealed record SpaScheduleData(
    IReadOnlyList<TimeOnly> SlotTimes,
    int BufferMinutes,
    IReadOnlyList<StaffShiftWindow> Shifts,
    IReadOnlyList<HeldSpaBooking> HeldBookings);

