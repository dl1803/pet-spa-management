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

public sealed class AssignmentService(
    IAssignmentRepository assignments,
    ISpaScheduleRepository schedule,
    IConcurrencyGuard concurrency)
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
        var busy = await assignments.ListHoldingStaffWindowsAsync(holdStart, holdEnd, appointmentId, ct);

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

    public async Task AssignSpaStaffAsync(
        CurrentUser user,
        Guid appointmentId,
        IReadOnlyCollection<Guid>? staffIds,
        bool confirmOutOfShift,
        CancellationToken ct = default)
    {
        if (user.Role != UserRole.Manager) throw new BusinessException(ErrorCodes.Forbidden);
        if (staffIds is null || staffIds.Count == 0)
            throw new BusinessException(ErrorCodes.ValidationError, "Danh sách nhân viên phân công không được để trống.");

        await concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            var rows = appointment.AssignStaff(staffIds);
            var chosenIds = rows.Select(r => r.StaffId).ToList();

            var holdStart = appointment.SlotStart;
            var holdEnd = appointment.BusyUntil;

            var chosenStaff = (await assignments.ListActiveSpaStaffAsync(ct))
                .Where(s => chosenIds.Contains(s.StaffId))
                .ToList();
            if (chosenStaff.Count != chosenIds.Count)
                throw new BusinessException(ErrorCodes.ValidationError, "Chỉ được phân công nhân viên spa đang hoạt động.");

            var busy = await assignments.ListHoldingStaffWindowsAsync(holdStart, holdEnd, appointmentId, ct);
            if (busy.Any(b => chosenIds.Contains(b.StaffId)))
                throw new BusinessException(ErrorCodes.StaffConflict);

            if (!confirmOutOfShift)
            {
                var shifts = await schedule.ListActiveSpaStaffShiftsAsync(holdStart, holdEnd, ct);
                var withShift = SlotService.AvailableStaff(
                    chosenStaff.Select(s => new SlotStaffCandidate(s.StaffId, s.FullName)).ToList(),
                    shifts.Select(s => new SlotStaffShift(s.StaffId, s.ShiftStart, s.ShiftEnd)).ToList(),
                    [],
                    holdStart,
                    holdEnd);

                var outOfShiftNames = chosenStaff
                    .Where(s => withShift.All(w => w.StaffId != s.StaffId))
                    .Select(s => s.FullName)
                    .ToList();

                if (outOfShiftNames.Count > 0)
                    throw new BusinessException(
                        ErrorCodes.StaffOutOfShift,
                        $"Nhân viên không có ca làm phủ khung giờ này: {string.Join(", ", outOfShiftNames)}. "
                        + "Gửi confirmOutOfShift = true để vẫn xác nhận.");
            }

            await assignments.SetStaffAssignmentsAsync(appointmentId, rows, ct);
        }, ct);
    }
}

