using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

public sealed record SpaStaffSuggestionsResult(
    int StaffRequired,
    IReadOnlyList<SlotStaffSuggestion> Suggested,
    IReadOnlyList<SlotStaffSuggestion> Alternatives);

public sealed class AssignmentService(IAssignmentRepository assignments, ISpaScheduleRepository schedule)
{
    public async Task<SpaStaffSuggestionsResult> GetSpaSuggestionsAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        if (user.Role != UserRole.Manager) throw new BusinessException(ErrorCodes.Forbidden);

        var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (appointment.Status != AppointmentStatus.Pending)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        var holdStart = appointment.SlotStart;
        var holdEnd = appointment.BusyUntil;

        var candidates = await assignments.ListActiveSpaStaffAsync(ct);
        var shifts = await schedule.ListActiveSpaStaffShiftsAsync(holdStart, holdEnd, ct);
        var busy = await assignments.ListHoldingStaffWindowsAsync(holdStart, holdEnd, ct);

        var available = SlotService.AvailableStaff(
            candidates.Select(c => new SlotStaffCandidate(c.StaffId, c.FullName)).ToList(),
            shifts.Select(s => new SlotStaffShift(s.StaffId, s.ShiftStart, s.ShiftEnd)).ToList(),
            busy.Select(b => new SlotStaffBusy(b.StaffId, b.BusyFrom, b.BusyUntil)).ToList(),
            holdStart,
            holdEnd);

        var lookbackDays = await assignments.GetSuggestLookbackDaysAsync(ct);
        var recentCounts = await assignments.CountRecentAssignmentsAsync(
            DateTimeOffset.UtcNow.AddDays(-lookbackDays), ct);

        var suggestions = SlotService.SuggestStaff(available, recentCounts, appointment.StaffRequired);

        return new SpaStaffSuggestionsResult(
            appointment.StaffRequired, suggestions.Suggested, suggestions.Alternatives);
    }
}

