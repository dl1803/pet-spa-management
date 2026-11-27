using PetSpa.Application.Ports;

namespace PetSpa.Application.Services.Booking;

public sealed class NoShowStatisticsService(INoShowStatisticsRepository noShows)
{
    public async Task<int> CountRecentNoShowsAsync(
        Guid customerId, DateTimeOffset now, CancellationToken ct = default)
    {
        var windowDays = await noShows.GetWindowDaysAsync(ct);

        return await noShows.CountNoShowsSinceAsync(customerId, now.AddDays(-windowDays), ct);
    }
}
