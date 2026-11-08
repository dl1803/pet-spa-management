using PetSpa.Domain.Entities;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Booking;

public sealed record SelectedService(
    Guid ServiceId,
    string Name,
    decimal Price,
    int DurationMinutes,
    short StaffRequired,
    TimeOnly LatestStartTime);

public sealed record SpaSelection(Pet Pet, IReadOnlyList<SelectedService> Services)
{
    public int DurationMinutes => Services.Sum(x => x.DurationMinutes);

    public int StaffRequired =>
        SlotService.RequiredStaff(Services.Select(x => (int)x.StaffRequired), Pet.Temperament);

    public TimeOnly LatestStartTime => Services.Min(x => x.LatestStartTime);
}
