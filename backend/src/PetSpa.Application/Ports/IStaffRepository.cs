using PetSpa.Application.Common;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record StaffSummary(Guid StaffId, string UserName, string FullName, StaffRole StaffRole, bool IsActive);

public sealed record StaffConfirmedSpaAssignment(Guid AppointmentId, Guid? CustomerUserId);

public interface IStaffRepository
{
    Task<Guid> CreateAsync(
        string phone, string fullName, StaffRole staffRole, string password, CancellationToken ct = default);

    Task<PagedResult<StaffSummary>> ListAsync(int page, int pageSize, CancellationToken ct = default);

    Task UpdateAsync(Guid staffId, string fullName, StaffRole staffRole, CancellationToken ct = default);

    Task DeactivateAsync(Guid staffId, CancellationToken ct = default);

    Task<IReadOnlyList<Guid>> ListConfirmedSpaAppointmentIdsAsync(Guid staffId, CancellationToken ct = default);

    Task<StaffConfirmedSpaAssignment?> FindConfirmedSpaAssignmentAsync(
        Guid staffId, Guid appointmentId, CancellationToken ct = default);
}
