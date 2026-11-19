using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Assignment;

public sealed class CheckInService(
    IAssignmentRepository assignments,
    IConcurrencyGuard concurrency,
    IStaffRoleReader staffRoles)
{
    public async Task<AppointmentStatus> CheckInSpaAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        await EnsureReceptionistOrManagerAsync(user, ct);

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            var holdMinutes = await assignments.GetHoldMinutesAsync(ct);
            if (DateTimeOffset.UtcNow > appointment.SlotStart.AddMinutes(holdMinutes))
                throw new BusinessException(ErrorCodes.InvalidTransition);

            appointment.Receive();
            await assignments.UpdateSpaAppointmentAsync(appointment, ct);

            return appointment.Status;
        }, ct);
    }

    private async Task EnsureReceptionistOrManagerAsync(CurrentUser user, CancellationToken ct)
    {
        if (user.Role == UserRole.Manager) return;

        if (user.Role == UserRole.Staff
            && await staffRoles.GetStaffRoleAsync(user.UserId, ct) == StaffRole.Receptionist)
            return;

        throw new BusinessException(ErrorCodes.Forbidden);
    }
}

