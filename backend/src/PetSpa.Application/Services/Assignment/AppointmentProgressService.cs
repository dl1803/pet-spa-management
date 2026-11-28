using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Notifications;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

public sealed class AppointmentProgressService(
    IAppointmentQueryRepository appointments,
    IAssignmentRepository assignments,
    IAppointmentPhotoRepository photos,
    IAppointmentProgressRepository progress,
    ICostConfirmationRepository costConfirmations,
    IPaymentRepository payments,
    IConcurrencyGuard concurrency,
    IStaffRoleReader staffRoles,
    AppointmentNotifier notifier)
{
    public async Task<AppointmentStatus> StartAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        await EnsureCanUpdateAsync(user, appointmentId, ct);

        var status = await concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (await costConfirmations.HasPendingAsync(appointmentId, ct))
                throw new BusinessException(ErrorCodes.CostConfirmationPending);

            var validityDays = await photos.GetValidityDaysAsync(ct);
            var latestBeforePhoto = await photos.FindLatestBeforePhotoUploadedAtByPetAsync(appointment.PetId, ct);

            appointment.StartWithValidBeforePhoto(latestBeforePhoto, validityDays, DateTimeOffset.UtcNow);
            await assignments.UpdateSpaAppointmentAsync(appointment, ct);

            return appointment.Status;
        }, ct);

        await notifier.StatusChangedAsync(appointmentId, status, ct);

        return status;
    }

    public async Task UpdateServiceAsync(
        CurrentUser user, Guid appointmentId, Guid serviceId, bool isDone, string? note, CancellationToken ct = default)
    {
        await EnsureCanUpdateAsync(user, appointmentId, ct);

        await concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            appointment.EnsureServiceProgressAllowed();

            var line = await progress.FindServiceLineAsync(appointmentId, serviceId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            line.SetProgress(isDone, note, DateTimeOffset.UtcNow);
            await progress.SaveChangesAsync(ct);
        }, ct);
    }

    public async Task<AppointmentStatus> CompleteAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        await EnsureCanUpdateAsync(user, appointmentId, ct);

        var status = await concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            var hasPendingCostConfirmation = await costConfirmations.HasPendingAsync(appointmentId, ct);
            var serviceLines = await progress.ListServiceLinesAsync(appointmentId, ct);
            var hasAfterPhoto = await photos.HasPhotoAsync(appointmentId, PhotoKind.After, ct);

            appointment.EnsureCanComplete(hasPendingCostConfirmation, serviceLines, hasAfterPhoto);

            var amount = await CalculateSpaAmountAsync(appointment, ct);

            appointment.Complete();
            await assignments.ReleaseStaffHoldsAsync(appointmentId, ct);
            payments.Add(new Payment
            {
                PaymentId = Guid.NewGuid(),
                AppointmentId = appointmentId,
                Kind = PaymentKind.Spa,
                Amount = amount,
                Status = PaymentStatus.Unpaid,
            });
            await assignments.UpdateSpaAppointmentAsync(appointment, ct);

            return appointment.Status;
        }, ct);

        await notifier.StatusChangedAsync(appointmentId, status, ct);

        return status;
    }

    private async Task<decimal> CalculateSpaAmountAsync(SpaAppointment appointment, CancellationToken ct)
    {
        var input = await assignments.GetSpaAmountInputAsync(appointment.AppointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        try
        {
            return PricingService.SpaAmount(input.Species, appointment.SizeGroup, input.ServiceIds, input.Pricing);
        }
        catch (InvalidOperationException ex)
        {
            throw new BusinessException(ErrorCodes.ValidationError, ex.Message);
        }
    }

    private async Task EnsureCanUpdateAsync(CurrentUser user, Guid appointmentId, CancellationToken ct)
    {
        switch (user.Role)
        {
            case UserRole.Manager:
                break;
            case UserRole.Staff:
                if (await staffRoles.GetStaffRoleAsync(user.UserId, ct) != StaffRole.SpaStaff)
                    throw new BusinessException(ErrorCodes.Forbidden);
                break;
            default:
                throw new BusinessException(ErrorCodes.Forbidden);
        }

        var detail = await appointments.FindDetailAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (detail.Appointment is not SpaAppointment)
            throw new BusinessException(ErrorCodes.NotFound);

        if (user.Role == UserRole.Staff
            && !await appointments.IsAssignedToSpaStaffAsync(appointmentId, user.UserId, ct))
            throw new BusinessException(ErrorCodes.Forbidden);
    }
}
