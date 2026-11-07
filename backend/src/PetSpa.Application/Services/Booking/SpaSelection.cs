using PetSpa.Domain.Entities;

namespace PetSpa.Application.Services.Booking;

public sealed record SelectedService(
    Guid ServiceId,
    string Name,
    decimal Price,
    int DurationMinutes,
    short StaffRequired,
    TimeOnly LatestStartTime);

public sealed record SpaSelection(Pet Pet, IReadOnlyList<SelectedService> Services);

