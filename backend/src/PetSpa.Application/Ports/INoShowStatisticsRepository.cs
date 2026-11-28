namespace PetSpa.Application.Ports;

public interface INoShowStatisticsRepository
{
    Task<int> GetWindowDaysAsync(CancellationToken ct = default);

    Task<int> CountNoShowsSinceAsync(Guid customerId, DateTimeOffset since, CancellationToken ct = default);

    Task<int> GetLockThresholdAsync(CancellationToken ct = default);

    Task LockBookingAsync(Guid customerId, CancellationToken ct = default);
}
