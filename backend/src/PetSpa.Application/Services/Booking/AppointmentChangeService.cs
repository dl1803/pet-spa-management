using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Booking;

public sealed record AppointmentChange(
    Guid PetId,
    DateTimeOffset? SlotStart,
    IReadOnlyCollection<Guid>? ServiceIds,
    DateTimeOffset? PlannedCheckIn,
    DateTimeOffset? PlannedCheckOut);

public sealed class AppointmentChangeService(
    IAppointmentChangeRepository changes,
    BookingService bookingService,
    HotelBookingService hotelBookingService,
    IPetRepository pets,
    IConcurrencyGuard concurrency)
{
    public async Task<AppointmentStatus> ChangeAsync(
        CurrentUser user, Guid appointmentId, AppointmentChange change, CancellationToken ct = default)
    {
        var target = await FindOwnedAsync(user, appointmentId, ct);

        var deadlineMinutes = await changes.GetChangeCancelDeadlineMinutesAsync(ct);
        EnsureChangeable(target.Appointment, deadlineMinutes);

        if (target.Appointment is SpaAppointment)
            return await ChangeSpaAsync(user, appointmentId, change, deadlineMinutes, ct);

        if (target.Appointment is HotelAppointment)
            return await ChangeHotelAsync(user, appointmentId, change, deadlineMinutes, ct);

        throw new InvalidOperationException("Loại lịch hẹn không được hỗ trợ.");
    }

    private async Task<AppointmentStatus> ChangeSpaAsync(
        CurrentUser user, Guid appointmentId, AppointmentChange change, int deadlineMinutes, CancellationToken ct)
    {
        if (change.SlotStart is null)
            throw new BusinessException(ErrorCodes.ValidationError, "slotStart là bắt buộc với lịch spa.");

        if (change.ServiceIds is null || change.ServiceIds.Count == 0)
            throw new BusinessException(ErrorCodes.ValidationError, "serviceIds phải gồm ít nhất một mã dịch vụ.");

        var selection = await bookingService.ResolveSpaSelectionAsync(user, change.PetId, change.ServiceIds, ct);
        var plan = await bookingService.PlanSpaSlotAsync(selection, change.SlotStart.Value, ct);

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockSpaDayAsync(plan.Day, ct);
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var current = await changes.FindForUpdateAsync(appointmentId, ct) as SpaAppointment
                ?? throw new BusinessException(ErrorCodes.NotFound);

            EnsureChangeable(current, deadlineMinutes);

            await bookingService.EnsureSpaSlotAvailableAsync(selection, plan, appointmentId, ct);

            current.Reschedule(
                selection.Pet.PetId,
                selection.Pet.SizeGroup,
                plan.SlotStart,
                plan.SlotEnd,
                plan.BusyUntil,
                (short)selection.StaffRequired);

            await changes.SaveSpaChangeAsync(current, selection.Services.Select(x => x.ServiceId).ToList(), ct);

            return current.Status;
        }, ct);
    }

    private async Task<AppointmentStatus> ChangeHotelAsync(
        CurrentUser user, Guid appointmentId, AppointmentChange change, int deadlineMinutes, CancellationToken ct)
    {
        if (change.PlannedCheckIn is null || change.PlannedCheckOut is null)
            throw new BusinessException(
                ErrorCodes.ValidationError, "plannedCheckIn và plannedCheckOut là bắt buộc với lịch lưu trú.");

        var found = await pets.FindWithOwnerAsync(change.PetId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        OwnershipGuard.EnsureOwner(user, found.OwnerUserId);

        if (!found.Pet.IsActive) throw new BusinessException(ErrorCodes.NotFound);

        var pet = found.Pet;
        var (checkIn, checkOut) = hotelBookingService.NormalizeStay(change.PlannedCheckIn.Value, change.PlannedCheckOut.Value);

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockHotelGroupAsync(pet.Species, pet.SizeGroup, ct);
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var current = await changes.FindForUpdateAsync(appointmentId, ct) as HotelAppointment
                ?? throw new BusinessException(ErrorCodes.NotFound);

            EnsureChangeable(current, deadlineMinutes);

            if (!await hotelBookingService.HasCapacityForGroupAsync(
                    pet.Species, pet.SizeGroup, checkIn, checkOut, appointmentId, ct))
                throw new BusinessException(ErrorCodes.NoCapacity);

            current.Reschedule(pet.PetId, pet.SizeGroup, checkIn, checkOut);

            await changes.SaveHotelChangeAsync(current, ct);

            return current.Status;
        }, ct);
    }

    private static void EnsureChangeable(Appointment appointment, int deadlineMinutes)
    {
        appointment.EnsureChangeableByCustomer();
        ChangeWindow.EnsureOpen(appointment.GetScheduledStart(), DateTimeOffset.UtcNow, deadlineMinutes);
    }

    private async Task<AppointmentChangeTarget> FindOwnedAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct)
    {
        if (user.Role != UserRole.Customer) throw new BusinessException(ErrorCodes.Forbidden);

        var target = await changes.FindTargetAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        OwnershipGuard.EnsureOwner(user, target.OwnerUserId);

        return target;
    }
}
