using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Notifications;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

public sealed record HotelCageSuggestionResult(Cage? Cage);

public sealed class HotelAssignmentService(
    IHotelAssignmentRepository hotelAssignments,
    ShopTimeZone shopTimeZone,
    IConcurrencyGuard concurrency,
    AppointmentNotifier notifier)
{
    public async Task<HotelCageSuggestionResult?> GetCageSuggestionAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        if (user.Role != UserRole.Manager) throw new BusinessException(ErrorCodes.Forbidden);

        var stay = await hotelAssignments.FindHotelStayAsync(appointmentId, ct);
        if (stay is null) return null;

        if (stay.Status != AppointmentStatus.Pending)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        var checkInDate = shopTimeZone.ToLocal(stay.PlannedCheckIn).Date;
        var checkOutDate = shopTimeZone.ToLocal(stay.PlannedCheckOut).Date;

        var cages = await hotelAssignments.ListCagesAsync(ct);
        var windows = await hotelAssignments.ListCageStayWindowsAsync(stay.PlannedCheckIn, stay.PlannedCheckOut, ct);

        var occupiedStays = windows
            .Select(w => new SlotCageStay(
                w.CageId,
                shopTimeZone.ToLocal(w.PlannedCheckIn).Date,
                shopTimeZone.ToLocal(w.PlannedCheckOut).Date))
            .ToList();

        var cage = SlotService.SuggestCage(
            cages, occupiedStays, stay.Species, stay.SizeGroup, checkInDate, checkOutDate);

        return new HotelCageSuggestionResult(cage);
    }

    public async Task<AppointmentStatus> ConfirmHotelAsync(
        CurrentUser user, Guid appointmentId, Guid cageId, CancellationToken ct = default)
    {
        if (user.Role != UserRole.Manager) throw new BusinessException(ErrorCodes.Forbidden);

        var preCheck = await hotelAssignments.FindHotelAppointmentAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (preCheck.Appointment.Status != AppointmentStatus.Pending)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        var status = await concurrency.RunAsync(async () =>
        {
            await concurrency.LockHotelGroupAsync(preCheck.Species, preCheck.Appointment.SizeGroup, ct);
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var found = await hotelAssignments.FindHotelAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);
            var stay = found.Appointment;

            if (stay.Status != AppointmentStatus.Pending)
                throw new BusinessException(ErrorCodes.InvalidTransition);

            var cage = await hotelAssignments.FindCageAsync(cageId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            var checkInDate = shopTimeZone.ToLocal(stay.PlannedCheckIn).Date;
            var checkOutDate = shopTimeZone.ToLocal(stay.PlannedCheckOut).Date;

            var windows = await hotelAssignments.ListCageStayWindowsAsync(stay.PlannedCheckIn, stay.PlannedCheckOut, ct);
            var occupiedStays = windows
                .Select(w => new SlotCageStay(
                    w.CageId,
                    shopTimeZone.ToLocal(w.PlannedCheckIn).Date,
                    shopTimeZone.ToLocal(w.PlannedCheckOut).Date))
                .ToList();

            var freeCage = SlotService.SuggestCage(
                [cage], occupiedStays, found.Species, stay.SizeGroup, checkInDate, checkOutDate);
            if (freeCage is null) throw new BusinessException(ErrorCodes.CageConflict);

            stay.AssignCage(cage, found.Species);
            await hotelAssignments.UpdateHotelAppointmentAsync(stay, ct);

            return stay.Status;
        }, ct);

        await notifier.ConfirmedAsync(appointmentId, ct);

        return status;
    }

    public async Task RejectHotelAsync(CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        if (user.Role != UserRole.Manager) throw new BusinessException(ErrorCodes.Forbidden);

        await concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var appointment = await hotelAssignments.FindAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            appointment.Reject();
            await hotelAssignments.UpdateHotelAppointmentAsync(appointment, ct);
        }, ct);

        await notifier.CancelledAsync(appointmentId, ct);
    }
}

