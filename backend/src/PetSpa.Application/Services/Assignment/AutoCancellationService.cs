using PetSpa.Application.Ports;

namespace PetSpa.Application.Services.Assignment;

public sealed class AutoCancellationService(
    IAutoCancellationRepository candidates,
    IAppointmentChangeRepository appointments,
    IAssignmentRepository assignments,
    IConcurrencyGuard concurrency)
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

    private Task<bool> TryCancelNoShowAsync(Guid appointmentId, int holdMinutes, CancellationToken ct) =>
        concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var appointment = await appointments.FindForUpdateAsync(appointmentId, ct);
            var now = DateTimeOffset.UtcNow;
            if (appointment is null || !appointment.IsNoShowDue(now, holdMinutes)) return false;

            appointment.CancelAsNoShow(now, holdMinutes);
            await appointments.SaveCancellationAsync(appointment, ct);
            return true;
        }, ct);
}
