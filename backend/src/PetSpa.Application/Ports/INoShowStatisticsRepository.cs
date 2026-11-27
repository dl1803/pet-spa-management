namespace PetSpa.Application.Ports;

public interface INoShowStatisticsRepository
{
    Task<int> GetWindowDaysAsync(CancellationToken ct = default);

    Task<int> CountNoShowsSinceAsync(Guid customerId, DateTimeOffset since, CancellationToken ct = default);
}
