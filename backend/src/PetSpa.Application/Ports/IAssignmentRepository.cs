using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record SpaStaffCandidate(Guid StaffId, string FullName);

public sealed record StaffBusyWindow(Guid StaffId, DateTimeOffset BusyFrom, DateTimeOffset BusyUntil);

public sealed record SpaAmountInput(
    Species Species,
    IReadOnlyList<Guid> ServiceIds,
    IReadOnlyList<ServicePricing> Pricing);

public interface IAssignmentRepository
{
    Task<IReadOnlyList<SpaStaffCandidate>> ListActiveSpaStaffAsync(CancellationToken ct = default);

    Task<IReadOnlyList<StaffBusyWindow>> ListHoldingStaffWindowsAsync(
        DateTimeOffset rangeStart,
        DateTimeOffset rangeEnd,
        Guid? excludeAppointmentId = null,
        CancellationToken ct = default);

    Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default);

    Task<int> GetSuggestLookbackDaysAsync(CancellationToken ct = default);

    Task<IReadOnlyDictionary<Guid, int>> CountRecentAssignmentsAsync(
        DateTimeOffset since, CancellationToken ct = default);

    Task SetStaffAssignmentsAsync(
        Guid appointmentId, IReadOnlyList<AppointmentStaff> staffAssignments, CancellationToken ct = default);

    Task AddStaffAssignmentsAsync(IReadOnlyList<AppointmentStaff> staffAssignments, CancellationToken ct = default);

    Task<int> CountActiveHoldingStaffAsync(Guid appointmentId, CancellationToken ct = default);

    Task ReleaseStaffHoldsAsync(Guid appointmentId, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);

    Task<SpaAmountInput?> GetSpaAmountInputAsync(Guid appointmentId, CancellationToken ct = default);
}
