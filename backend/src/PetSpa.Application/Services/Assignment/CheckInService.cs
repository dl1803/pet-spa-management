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
    private const int EarlyCheckInWindowMinutes = 60;

    public async Task<AppointmentStatus> CheckInSpaAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        await EnsureReceptionistOrManagerAsync(user, ct);

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            var now = DateTimeOffset.UtcNow;
            var holdMinutes = await assignments.GetHoldMinutesAsync(ct);
            if (now > appointment.SlotStart.AddMinutes(holdMinutes) || now < appointment.SlotStart.AddMinutes(-EarlyCheckInWindowMinutes))
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

