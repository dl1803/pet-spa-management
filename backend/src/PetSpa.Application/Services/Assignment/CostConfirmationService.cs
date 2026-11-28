using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Notifications;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Assignment;

public sealed record CostConfirmationResult(AppointmentStatus Status, bool? CageSuitable = null);

public sealed class CostConfirmationService(
    IAppointmentChangeRepository appointments,
    ICostConfirmationRepository costConfirmations,
    IPetRepository pets,
    IHotelAssignmentRepository hotelAssignments,
    IConcurrencyGuard concurrency,
    IStaffRoleReader staffRoles,
    AppointmentNotifier notifier)
{
    public async Task<CostConfirmationResult> RespondAsync(
        CurrentUser user, Guid appointmentId, bool accept, CancellationToken ct = default)
    {
        await EnsureCustomerOrReceptionistAsync(user, ct);

        var target = await appointments.FindTargetAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (user.Role == UserRole.Customer)
            OwnershipGuard.EnsureOwner(user, target.OwnerUserId);

        var result = await concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var appointment = await appointments.FindForUpdateAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            var confirmation = await costConfirmations.FindPendingAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (!appointment.CanCancelWith(CancelReason.CostNotConfirmed))
                throw new BusinessException(ErrorCodes.InvalidTransition);

            var now = DateTimeOffset.UtcNow;

            return accept
                ? await AcceptAsync(user, appointment, confirmation, now, ct)
                : await RejectAsync(user, appointment, confirmation, now, ct);
        }, ct);

        if (!accept)
            await notifier.CancelledAsync(appointmentId, ct);

        return result;
    }

    private async Task<CostConfirmationResult> AcceptAsync(
        CurrentUser user, Appointment appointment, CostConfirmation confirmation, DateTimeOffset now, CancellationToken ct)
    {
        var found = await pets.FindWithOwnerAsync(appointment.PetId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);
        var pet = found.Pet;
        var sizeRules = await pets.GetSizeRulesAsync(pet.Species, ct);

        confirmation.Accept(user.UserId, now);
        appointment.RecordWeight(confirmation.ActualWeightKg, confirmation.NewSizeGroup);
        pet.WeightKg = confirmation.ActualWeightKg;
        pet.DetermineSizeGroup(sizeRules);

        bool? cageSuitable = null;
        if (appointment is HotelAppointment stay)
        {
            var cage = stay.CageId is { } cageId ? await hotelAssignments.FindCageAsync(cageId, ct) : null;
            cageSuitable = stay.IsCageSuitable(cage, pet.Species);
        }

        await costConfirmations.SaveChangesAsync(ct);

        return new CostConfirmationResult(appointment.Status, cageSuitable);
    }

    private async Task<CostConfirmationResult> RejectAsync(
        CurrentUser user, Appointment appointment, CostConfirmation confirmation, DateTimeOffset now, CancellationToken ct)
    {
        confirmation.Reject(user.UserId, now);
        appointment.Cancel(CancelReason.CostNotConfirmed);

        await appointments.SaveCancellationAsync(appointment, ct);

        return new CostConfirmationResult(appointment.Status);
    }

    private async Task EnsureCustomerOrReceptionistAsync(CurrentUser user, CancellationToken ct)
    {
        if (user.Role == UserRole.Customer) return;

        if (user.Role == UserRole.Staff
            && await staffRoles.GetStaffRoleAsync(user.UserId, ct) == StaffRole.Receptionist)
            return;

        throw new BusinessException(ErrorCodes.Forbidden);
    }
}

