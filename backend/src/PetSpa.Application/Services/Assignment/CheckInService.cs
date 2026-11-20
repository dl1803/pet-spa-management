using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

public sealed record WeightCheckOutcome(WeightCheckResult Result, SizeGroup? NewSizeGroup);

public sealed record SpaCheckInResult(AppointmentStatus Status, WeightCheckOutcome WeightCheck);

public sealed class CheckInService(
    IAssignmentRepository assignments,
    IConcurrencyGuard concurrency,
    IStaffRoleReader staffRoles,
    IPetRepository pets,
    IHotelAssignmentRepository hotelAssignments)
{
    private const int EarlyCheckInWindowMinutes = 60;

    public async Task<SpaCheckInResult> CheckInSpaAsync(
        CurrentUser user, Guid appointmentId, decimal actualWeightKg, CancellationToken ct = default)
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
            var weightCheck = await RecordWeightAsync(appointment, actualWeightKg, ct);
            await assignments.UpdateSpaAppointmentAsync(appointment, ct);

            return new SpaCheckInResult(appointment.Status, weightCheck);
        }, ct);
    }

    public async Task<WeightCheckOutcome> CheckHotelWeightAsync(
        CurrentUser user, Guid appointmentId, decimal actualWeightKg, CancellationToken ct = default)
    {
        await EnsureReceptionistOrManagerAsync(user, ct);

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var found = await hotelAssignments.FindHotelAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);
            var stay = found.Appointment;

            if (stay.Status != AppointmentStatus.Confirmed)
                throw new BusinessException(ErrorCodes.InvalidTransition);

            var weightCheck = await RecordWeightAsync(stay, actualWeightKg, ct);
            await hotelAssignments.UpdateHotelAppointmentAsync(stay, ct);

            return weightCheck;
        }, ct);
    }

    private async Task<WeightCheckOutcome> RecordWeightAsync(
        Appointment appointment, decimal actualWeightKg, CancellationToken ct)
    {
        var found = await pets.FindWithOwnerAsync(appointment.PetId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);
        var pet = found.Pet;

        var sizeRules = await pets.GetSizeRulesAsync(pet.Species, ct);
        var tolerances = await pets.GetWeightTolerancesAsync(pet.Species, ct);

        var comparison = WeightComparisonService.Compare(
            pet, appointment.SizeGroup, actualWeightKg, sizeRules, tolerances);

        appointment.RecordWeight(actualWeightKg);

        return comparison.Result == WeightCheckResult.OK
            ? new WeightCheckOutcome(WeightCheckResult.OK, null)
            : new WeightCheckOutcome(comparison.Result, comparison.NewSizeGroup);
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
