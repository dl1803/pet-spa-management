using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

public sealed record HotelReturnTarget(HotelAppointment Stay, DateTimeOffset ReturnedAt);

public sealed record HotelCheckOutResult(AppointmentStatus Status, decimal? LateFee);

public sealed class CheckOutService(
    IHotelAssignmentRepository hotelAssignments,
    IStaffRoleReader staffRoles,
    IHotelCatalogRepository hotelCatalog,
    IPaymentRepository payments,
    IConcurrencyGuard concurrency)
{
    public async Task<HotelReturnTarget> ResolveHotelReturnAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        await EnsureReceptionistOrManagerAsync(user, ct);

        var found = await hotelAssignments.FindHotelAppointmentAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);
        var stay = found.Appointment;

        if (stay.Status != AppointmentStatus.InStay)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        return new HotelReturnTarget(stay, DateTimeOffset.UtcNow);
    }

    public async Task<decimal> CalculateLateFeeAsync(HotelReturnTarget target, CancellationToken ct = default)
    {
        var graceMinutes = await hotelCatalog.GetLateGraceMinutesAsync(ct);
        var blockMinutes = await hotelCatalog.GetLateBlockMinutesAsync(ct);
        var feePerBlock = await hotelCatalog.GetLateFeePerBlockAsync(ct);

        return PricingService.LateFee(
            target.Stay.PlannedCheckOut, target.ReturnedAt, graceMinutes, blockMinutes, feePerBlock);
    }

    public async Task<HotelCheckOutResult> CheckOutHotelAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        await EnsureReceptionistOrManagerAsync(user, ct);

        var lateFeeUnpaid = false;

        var result = await concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var target = await ResolveHotelReturnAsync(user, appointmentId, ct);
            var stay = target.Stay;
            var returnedAt = stay.ActualCheckOut ?? target.ReturnedAt;

            var lateFee = (await payments.ListByAppointmentAsync(appointmentId, ct))
                .FirstOrDefault(p => p.Kind == PaymentKind.LateFee);

            if (lateFee is null)
            {
                var amount = await CalculateLateFeeAsync(new HotelReturnTarget(stay, returnedAt), ct);
                if (amount > 0)
                {
                    lateFee = new Payment
                    {
                        PaymentId = Guid.NewGuid(),
                        AppointmentId = appointmentId,
                        Kind = PaymentKind.LateFee,
                        Amount = amount,
                        Status = PaymentStatus.Unpaid,
                    };
                    payments.Add(lateFee);
                }
            }

            if (lateFee is not null && lateFee.Status != PaymentStatus.Paid)
            {
                stay.ActualCheckOut = returnedAt;
                await hotelAssignments.UpdateHotelAppointmentAsync(stay, ct);

                lateFeeUnpaid = true;
                return new HotelCheckOutResult(stay.Status, lateFee.Amount);
            }

            stay.CheckOut(returnedAt);
            await hotelAssignments.UpdateHotelAppointmentAsync(stay, ct);

            return new HotelCheckOutResult(stay.Status, lateFee?.Amount);
        }, ct);

        if (lateFeeUnpaid)
            throw new BusinessException(ErrorCodes.PaymentNotDue);

        return result;
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
