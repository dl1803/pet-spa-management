namespace PetSpa.Application.Ports;

public interface IAutoCancellationRepository
{
    Task<IReadOnlyList<Guid>> ListNoShowCandidateIdsAsync(
        DateTimeOffset startedBefore, CancellationToken ct = default);

    Task<IReadOnlyList<Guid>> ListOverdueCostConfirmationAppointmentIdsAsync(
        DateTimeOffset now, CancellationToken ct = default);
}
