using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record HeldHotelStay(DateTimeOffset PlannedCheckIn, DateTimeOffset PlannedCheckOut);

public interface IHotelBookingRepository
{
    Task<int> CountActiveCagesAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default);

    Task<IReadOnlyList<HeldHotelStay>> ListHeldHotelStaysAsync(
        Species species, SizeGroup sizeGroup, DateTimeOffset rangeStart, DateTimeOffset rangeEnd,
        CancellationToken ct = default);

    Task AddHotelAppointmentAsync(HotelAppointment appointment, CancellationToken ct = default);
}

