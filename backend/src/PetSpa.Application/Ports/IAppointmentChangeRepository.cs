namespace PetSpa.Application.Ports;

public interface IAppointmentChangeRepository
{
    Task<int> GetChangeCancelDeadlineMinutesAsync(CancellationToken ct = default);
}
