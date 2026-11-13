using PetSpa.Domain.Entities;

namespace PetSpa.Application.Ports;

public sealed record SpaStaffCandidate(Guid StaffId, string FullName);

public sealed record StaffBusyWindow(Guid StaffId, DateTimeOffset BusyFrom, DateTimeOffset BusyUntil);

public interface IAssignmentRepository
{
    Task<IReadOnlyList<SpaStaffCandidate>> ListActiveSpaStaffAsync(CancellationToken ct = default);

    Task<IReadOnlyList<StaffBusyWindow>> ListHoldingStaffWindowsAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default);

    Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default);

    Task<int> GetSuggestLookbackDaysAsync(CancellationToken ct = default);

    Task<IReadOnlyDictionary<Guid, int>> CountRecentAssignmentsAsync(
        DateTimeOffset since, CancellationToken ct = default);
}
