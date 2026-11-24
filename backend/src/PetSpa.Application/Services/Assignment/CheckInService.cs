using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

public sealed record WeightCheckOutcome(
    WeightCheckResult Result,
    SizeGroup? NewSizeGroup,
    decimal? OldAmount = null,
    decimal? NewAmount = null,
    DateTimeOffset? ExpiresAt = null);

public sealed record SpaCheckInResult(AppointmentStatus Status, WeightCheckOutcome WeightCheck);

public sealed class CheckInService(
    IAssignmentRepository assignments,
    IConcurrencyGuard concurrency,
    IStaffRoleReader staffRoles,
    IPetRepository pets,
    IHotelAssignmentRepository hotelAssignments,
    IHotelCatalogRepository hotelCatalog,
    ShopTimeZone shopTimeZone,
    ICostConfirmationRepository costConfirmations,
    IPaymentRepository payments = null!)
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

            if (costConfirmations is not null && await costConfirmations.HasPendingAsync(appointmentId, ct))
                throw new BusinessException(ErrorCodes.CostConfirmationPending);

            appointment.Receive();
            var weightCheck = await RecordWeightAsync(
                appointment,
                actualWeightKg,
                (oldGroup, newGroup) => QuoteSpaAsync(appointmentId, oldGroup, newGroup, ct),
                ct);
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

            if (await costConfirmations.HasPendingAsync(appointmentId, ct))
                throw new BusinessException(ErrorCodes.CostConfirmationPending);

            var weightCheck = await RecordWeightAsync(
                stay,
                actualWeightKg,
                (oldGroup, newGroup) => QuoteStayAsync(stay, found.Species, oldGroup, newGroup, ct),
                ct);
            await hotelAssignments.UpdateHotelAppointmentAsync(stay, ct);

            return weightCheck;
        }, ct);
    }

    public async Task EnsureHotelCheckInCostAndPaymentAsync(HotelAppointment stay, CancellationToken ct = default)
    {
        if (stay.ActualWeightKg is null)
            throw new BusinessException(ErrorCodes.InvalidTransition, "Chưa đối chiếu cân nặng thực tế của thú cưng.");

        if (await costConfirmations.HasPendingAsync(stay.AppointmentId, ct))
            throw new BusinessException(ErrorCodes.CostConfirmationPending);

        var stayPayments = await payments.ListByAppointmentAsync(stay.AppointmentId, ct);
        if (!stayPayments.Any(p => p.Kind == PaymentKind.Stay && p.Status == PaymentStatus.Paid))
            throw new BusinessException(ErrorCodes.PaymentNotDue);
    }

    private async Task<WeightCheckOutcome> RecordWeightAsync(
        Appointment appointment,
        decimal actualWeightKg,
        Func<SizeGroup, SizeGroup, Task<(decimal OldAmount, decimal NewAmount)>> quoteAsync,
        CancellationToken ct)
    {
        var found = await pets.FindWithOwnerAsync(appointment.PetId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);
        var pet = found.Pet;

        var sizeRules = await pets.GetSizeRulesAsync(pet.Species, ct);
        var tolerances = await pets.GetWeightTolerancesAsync(pet.Species, ct);

        var currentGroup = appointment.SizeGroup;
        WeightComparison comparison;
        try
        {
            comparison = WeightComparisonService.Compare(
                pet, currentGroup, actualWeightKg, sizeRules, tolerances);
        }
        catch (InvalidOperationException ex)
        {
            throw new BusinessException(ErrorCodes.ValidationError, ex.Message);
        }

        if (comparison.Result == WeightCheckResult.OK)
        {
            appointment.RecordWeight(actualWeightKg);
            UpdatePetProfile(pet, sizeRules, actualWeightKg);

            return new WeightCheckOutcome(WeightCheckResult.OK, null);
        }

        var (oldAmount, newAmount) = await quoteAsync(currentGroup, comparison.NewSizeGroup);

        if (comparison.Result == WeightCheckResult.PRICE_DECREASED)
        {
            appointment.RecordWeight(actualWeightKg, comparison.NewSizeGroup);
            UpdatePetProfile(pet, sizeRules, actualWeightKg);

            return new WeightCheckOutcome(
                WeightCheckResult.PRICE_DECREASED, comparison.NewSizeGroup, oldAmount, newAmount);
        }

        appointment.RecordWeight(actualWeightKg);

        var expiresAt = await CreateConfirmationAsync(
            appointment.AppointmentId, actualWeightKg, comparison.NewSizeGroup, oldAmount, newAmount, ct);

        return new WeightCheckOutcome(
            WeightCheckResult.NEEDS_CONFIRMATION, comparison.NewSizeGroup, oldAmount, newAmount, expiresAt);
    }

    private async Task<DateTimeOffset> CreateConfirmationAsync(
        Guid appointmentId,
        decimal actualWeightKg,
        SizeGroup newSizeGroup,
        decimal oldAmount,
        decimal newAmount,
        CancellationToken ct)
    {
        var timeoutMinutes = await costConfirmations.GetTimeoutMinutesAsync(ct);
        var now = DateTimeOffset.UtcNow;

        var confirmation = new CostConfirmation
        {
            ConfirmationId = Guid.NewGuid(),
            AppointmentId = appointmentId,
            ActualWeightKg = actualWeightKg,
            NewSizeGroup = newSizeGroup,
            OldAmount = oldAmount,
            NewAmount = newAmount,
            Status = ConfirmationStatus.Pending,
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(timeoutMinutes),
        };

        costConfirmations.Add(confirmation);

        return confirmation.ExpiresAt;
    }

    private static void UpdatePetProfile(Pet pet, IReadOnlyList<SizeRule> sizeRules, decimal actualWeightKg)
    {
        pet.WeightKg = actualWeightKg;
        pet.DetermineSizeGroup(sizeRules);
    }

    private async Task<(decimal OldAmount, decimal NewAmount)> QuoteSpaAsync(
        Guid appointmentId, SizeGroup oldGroup, SizeGroup newGroup, CancellationToken ct)
    {
        var input = await assignments.GetSpaAmountInputAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        try
        {
            return (
                PricingService.SpaAmount(input.Species, oldGroup, input.ServiceIds, input.Pricing),
                PricingService.SpaAmount(input.Species, newGroup, input.ServiceIds, input.Pricing));
        }
        catch (InvalidOperationException ex)
        {
            throw new BusinessException(ErrorCodes.ValidationError, ex.Message);
        }
    }

    private async Task<(decimal OldAmount, decimal NewAmount)> QuoteStayAsync(
        HotelAppointment stay, Species species, SizeGroup oldGroup, SizeGroup newGroup, CancellationToken ct)
    {
        var checkInDate = shopTimeZone.ToLocal(stay.PlannedCheckIn).Date;
        var checkOutDate = shopTimeZone.ToLocal(stay.PlannedCheckOut).Date;
        var pricing = await hotelCatalog.ListPricingAsync(ct);

        try
        {
            return (
                PricingService.StayAmount(species, oldGroup, checkInDate, checkOutDate, pricing),
                PricingService.StayAmount(species, newGroup, checkInDate, checkOutDate, pricing));
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
        {
            throw new BusinessException(ErrorCodes.ValidationError, ex.Message);
        }
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
