using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Booking;

public sealed record ManagerAppointmentChange(
    Guid PetId,
    DateTimeOffset? SlotStart,
    IReadOnlyCollection<Guid>? ServiceIds,
    DateTimeOffset? PlannedCheckIn,
    DateTimeOffset? PlannedCheckOut,
    IReadOnlyCollection<Guid>? StaffIds,
    Guid? CageId,
    bool ConfirmOutOfShift);

public sealed record ManagerCancelDecision(Appointment Appointment, CancelReason Reason);

public sealed class AppointmentInterventionService(
    IAppointmentChangeRepository changes,
    IAssignmentRepository assignments,
    ISpaScheduleRepository schedule,
    IHotelAssignmentRepository hotelAssignments,
    BookingService bookingService,
    HotelBookingService hotelBookingService,
    IPetRepository pets,
    IConcurrencyGuard concurrency,
    ShopTimeZone shopTimeZone)
{
    public async Task<AppointmentStatus> RescheduleAsync(
        CurrentUser user, Guid appointmentId, ManagerAppointmentChange change, CancellationToken ct = default)
    {
        EnsureManager(user);

        var target = await changes.FindTargetAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        target.Appointment.EnsureChangeableByManager();

        if (target.Appointment is SpaAppointment)
            return await RescheduleSpaAsync(user, appointmentId, target.Appointment.CustomerId, change, ct);

        if (target.Appointment is HotelAppointment)
            return await RescheduleHotelAsync(appointmentId, target.Appointment.CustomerId, change, ct);

        throw new InvalidOperationException("Loại lịch hẹn không được hỗ trợ.");
    }

    private async Task<AppointmentStatus> RescheduleSpaAsync(
        CurrentUser user, Guid appointmentId, Guid customerId, ManagerAppointmentChange change, CancellationToken ct)
    {
        if (change.SlotStart is null)
            throw new BusinessException(ErrorCodes.ValidationError, "slotStart là bắt buộc với lịch spa.");

        if (change.ServiceIds is null || change.ServiceIds.Count == 0)
            throw new BusinessException(ErrorCodes.ValidationError, "serviceIds phải gồm ít nhất một mã dịch vụ.");

        var selection = await bookingService.ResolveSpaSelectionAsync(
            user, change.PetId, change.ServiceIds, ct, managedCustomerId: customerId);
        var plan = await bookingService.PlanSpaSlotAsync(selection, change.SlotStart.Value, ct);

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockSpaDayAsync(plan.Day, ct);
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var current = await changes.FindForUpdateAsync(appointmentId, ct) as SpaAppointment
                ?? throw new BusinessException(ErrorCodes.NotFound);

            current.EnsureChangeableByManager();

            await bookingService.EnsureSpaSlotAvailableAsync(selection, plan, appointmentId, ct);

            current.RescheduleByManager(
                selection.Pet.PetId,
                selection.Pet.SizeGroup,
                plan.SlotStart,
                plan.SlotEnd,
                plan.BusyUntil,
                (short)selection.StaffRequired);

            IReadOnlyList<AppointmentStaff> staffRows = [];

            if (current.Status == AppointmentStatus.Confirmed)
            {
                IReadOnlyCollection<Guid> staffIds = change.StaffIds is { Count: > 0 }
                    ? change.StaffIds
                    : await changes.ListHoldingStaffIdsAsync(appointmentId, ct);

                staffRows = current.ReassignStaff(staffIds);

                await EnsureStaffAssignableAsync(
                    staffRows.Select(r => r.StaffId).ToList(), current, change.ConfirmOutOfShift, ct);
            }
            else if (change.StaffIds is { Count: > 0 })
            {
                throw new BusinessException(
                    ErrorCodes.ValidationError, "Chỉ đổi nhân viên cho lịch đã xác nhận.");
            }

            await changes.SaveSpaChangeAsync(current, selection.Services.Select(x => x.ServiceId).ToList(), ct);

            if (staffRows.Count > 0)
                await assignments.SetStaffAssignmentsAsync(appointmentId, staffRows, ct);

            return current.Status;
        }, ct);
    }

    private async Task<AppointmentStatus> RescheduleHotelAsync(
        Guid appointmentId, Guid customerId, ManagerAppointmentChange change, CancellationToken ct)
    {
        if (change.PlannedCheckIn is null || change.PlannedCheckOut is null)
            throw new BusinessException(
                ErrorCodes.ValidationError, "plannedCheckIn và plannedCheckOut là bắt buộc với lịch lưu trú.");

        var found = await pets.FindWithOwnerAsync(change.PetId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (!found.Pet.IsActive) throw new BusinessException(ErrorCodes.NotFound);

        if (found.Pet.CustomerId != customerId)
            throw new BusinessException(ErrorCodes.ValidationError, "Thú cưng không thuộc khách hàng của lịch hẹn.");

        var pet = found.Pet;
        var (checkIn, checkOut) = hotelBookingService.NormalizeStay(change.PlannedCheckIn.Value, change.PlannedCheckOut.Value);

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockHotelGroupAsync(pet.Species, pet.SizeGroup, ct);
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var current = await changes.FindForUpdateAsync(appointmentId, ct) as HotelAppointment
                ?? throw new BusinessException(ErrorCodes.NotFound);

            current.EnsureChangeableByManager();

            if (!await hotelBookingService.HasCapacityForGroupAsync(
                    pet.Species, pet.SizeGroup, checkIn, checkOut, appointmentId, ct))
                throw new BusinessException(ErrorCodes.NoCapacity);

            current.RescheduleByManager(pet.PetId, pet.SizeGroup, checkIn, checkOut);

            if (current.Status == AppointmentStatus.Confirmed)
                await EnsureCageAssignableAsync(current, pet.Species, change.CageId, ct);
            else if (change.CageId is not null)
                throw new BusinessException(ErrorCodes.ValidationError, "Chỉ đổi chuồng cho lịch đã xác nhận.");

            await changes.SaveHotelChangeAsync(current, ct);

            return current.Status;
        }, ct);
    }

    private async Task EnsureStaffAssignableAsync(
        IReadOnlyList<Guid> staffIds, SpaAppointment appointment, bool confirmOutOfShift, CancellationToken ct)
    {
        var holdStart = appointment.SlotStart;
        var holdEnd = appointment.BusyUntil;

        var chosenStaff = (await assignments.ListActiveSpaStaffAsync(ct))
            .Where(s => staffIds.Contains(s.StaffId))
            .ToList();
        if (chosenStaff.Count != staffIds.Count)
            throw new BusinessException(ErrorCodes.ValidationError, "Chỉ được phân công nhân viên spa đang hoạt động.");

        var busy = await assignments.ListHoldingStaffWindowsAsync(holdStart, holdEnd, appointment.AppointmentId, ct);
        if (busy.Any(b => staffIds.Contains(b.StaffId)))
            throw new BusinessException(ErrorCodes.StaffConflict);

        if (confirmOutOfShift) return;

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

    private async Task EnsureCageAssignableAsync(
        HotelAppointment stay, Species species, Guid? requestedCageId, CancellationToken ct)
    {
        var cageId = requestedCageId ?? stay.CageId
            ?? throw new BusinessException(ErrorCodes.ValidationError, "Lịch đã xác nhận cần chỉ định chuồng (cageId).");

        var cage = await hotelAssignments.FindCageAsync(cageId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        var checkInDate = shopTimeZone.ToLocal(stay.PlannedCheckIn).Date;
        var checkOutDate = shopTimeZone.ToLocal(stay.PlannedCheckOut).Date;

        var windows = await hotelAssignments.ListCageStayWindowsAsync(stay.PlannedCheckIn, stay.PlannedCheckOut, ct);
        var occupiedStays = windows
            .Where(w => w.AppointmentId != stay.AppointmentId)
            .Select(w => new SlotCageStay(
                w.CageId,
                shopTimeZone.ToLocal(w.PlannedCheckIn).Date,
                shopTimeZone.ToLocal(w.PlannedCheckOut).Date))
            .ToList();

        if (SlotService.SuggestCage([cage], occupiedStays, species, stay.SizeGroup, checkInDate, checkOutDate) is null)
            throw new BusinessException(ErrorCodes.CageConflict);

        stay.ReassignCage(cage, species);
    }

    private static void EnsureManager(CurrentUser user)
    {
        if (user.Role != UserRole.Manager) throw new BusinessException(ErrorCodes.Forbidden);
    }

    private static readonly CancelReason[] ManagerCancelReasons =
        [CancelReason.StoreUnable, CancelReason.CustomerBeyondDeadline];

    public async Task<ManagerCancelDecision> ResolveCancelAsync(
        CurrentUser user, Guid appointmentId, CancelReason? reason, CancellationToken ct = default)
    {
        EnsureManager(user);

        if (reason is null)
            throw new BusinessException(ErrorCodes.ValidationError, "reason là bắt buộc khi quản lý hủy lịch.");

        if (!ManagerCancelReasons.Contains(reason.Value))
            throw new BusinessException(
                ErrorCodes.ValidationError, "reason chỉ được là StoreUnable hoặc CustomerBeyondDeadline.");

        var target = await changes.FindTargetAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (!target.Appointment.CanCancelWith(reason.Value))
            throw new BusinessException(ErrorCodes.InvalidTransition);

        return new ManagerCancelDecision(target.Appointment, reason.Value);
    }
}
