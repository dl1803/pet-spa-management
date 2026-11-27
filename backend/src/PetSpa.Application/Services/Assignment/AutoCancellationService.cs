using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services.Assignment;

public sealed class AutoCancellationService(
    IAutoCancellationRepository candidates,
    IAppointmentChangeRepository appointments,
    IAssignmentRepository assignments,
    IConcurrencyGuard concurrency,
    ICostConfirmationRepository costConfirmations)
{
    public async Task<int> CancelNoShowsAsync(CancellationToken ct = default)
    {
        var holdMinutes = await assignments.GetHoldMinutesAsync(ct);
        var cutoff = DateTimeOffset.UtcNow.AddMinutes(-holdMinutes);
        var appointmentIds = await candidates.ListNoShowCandidateIdsAsync(cutoff, ct);

        var cancelled = 0;
        foreach (var appointmentId in appointmentIds)
        {
            ct.ThrowIfCancellationRequested();

            if (await TryCancelNoShowAsync(appointmentId, holdMinutes, ct)) cancelled++;
        }

        return cancelled;
    }

    public async Task<int> CancelOverdueCostConfirmationsAsync(CancellationToken ct = default)
    {
        var appointmentIds = await candidates.ListOverdueCostConfirmationAppointmentIdsAsync(
            DateTimeOffset.UtcNow, ct);

        var cancelled = 0;
        foreach (var appointmentId in appointmentIds)
        {
            ct.ThrowIfCancellationRequested();

            if (await TryCancelOverdueCostConfirmationAsync(appointmentId, ct)) cancelled++;
        }

        return cancelled;
    }

    private Task<bool> TryCancelNoShowAsync(Guid appointmentId, int holdMinutes, CancellationToken ct) =>
        concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var appointment = await appointments.FindForUpdateAsync(appointmentId, ct);
            var now = DateTimeOffset.UtcNow;
            if (appointment is null || !appointment.IsNoShowDue(now, holdMinutes)) return false;

            if (await costConfirmations.HasPendingAsync(appointmentId, ct)) return false;

            appointment.CancelAsNoShow(now, holdMinutes);
            await appointments.SaveCancellationAsync(appointment, ct);
            return true;
        }, ct);

    private Task<bool> TryCancelOverdueCostConfirmationAsync(Guid appointmentId, CancellationToken ct) =>
        concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var appointment = await appointments.FindForUpdateAsync(appointmentId, ct);
            if (appointment is null || !appointment.CanCancelWith(CancelReason.CostNotConfirmed)) return false;

            var confirmation = await costConfirmations.FindPendingAsync(appointmentId, ct);
            var now = DateTimeOffset.UtcNow;
            if (confirmation is null || !confirmation.IsOverdue(now)) return false;

            confirmation.Expire(now);
            appointment.Cancel(CancelReason.CostNotConfirmed);
            await appointments.SaveCancellationAsync(appointment, ct);
            return true;
        }, ct);
}
