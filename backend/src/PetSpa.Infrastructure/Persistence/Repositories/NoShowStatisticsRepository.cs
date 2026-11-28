using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class NoShowStatisticsRepository(AppDbContext db) : INoShowStatisticsRepository
{
    public async Task<int> GetWindowDaysAsync(CancellationToken ct = default)
    {
        const int defaultWindowDays = 30;

        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "NoShow.WindowDays")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var days) && days > 0
            ? days
            : defaultWindowDays;
    }

    public async Task<int> GetLockThresholdAsync(CancellationToken ct = default)
    {
        const int defaultLockThreshold = 3;

        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "NoShow.LockThreshold")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var threshold) && threshold >= 0
            ? threshold
            : defaultLockThreshold;
    }

    public Task LockBookingAsync(Guid customerId, CancellationToken ct = default) =>
        db.Set<Customer>()
            .Where(c => c.CustomerId == customerId && !c.IsBookingLocked)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.IsBookingLocked, true), ct);

    public Task<int> CountNoShowsSinceAsync(Guid customerId, DateTimeOffset since, CancellationToken ct = default) =>
        NoShowsSince(db.Set<Appointment>().AsNoTracking(), customerId, since).CountAsync(ct);

    public static IQueryable<Appointment> NoShowsSince(
        IQueryable<Appointment> source, Guid customerId, DateTimeOffset since)
    {
        var sinceUtc = since.ToUniversalTime();

        return source.Where(a => a.CustomerId == customerId
            && a.CancelReason == CancelReason.NoShow
            && a.CancelledAt >= sinceUtc);
    }
}
