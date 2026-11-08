using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Booking;

public sealed record SpaSlotItem(TimeOnly Time, SlotGroup Group, SlotStatus Status);

public sealed record SpaSlotsResult(
    int DurationMinutes,
    int StaffRequired,
    int BufferMinutes,
    IReadOnlyList<SpaSlotItem> Slots);

public sealed record SpaBookingResult(SpaAppointment Appointment, decimal EstimatedAmount);

public sealed class BookingService(
    IPetRepository pets,
    IStaffRoleReader staffRoles,
    IServiceCatalogRepository catalog,
    ISpaScheduleRepository schedule,
    IConcurrencyGuard concurrency,
    ShopTimeZone shopTimeZone)
{
    public async Task<SpaSelection> ResolveSpaSelectionAsync(
        CurrentUser user, Guid petId, IReadOnlyCollection<Guid> serviceIds, CancellationToken ct = default)
    {
        var requestedIds = serviceIds.Distinct().ToList();
        if (requestedIds.Count == 0)
            throw new BusinessException(ErrorCodes.ValidationError, "Phải chọn ít nhất một dịch vụ.");

        var isCustomer = await IsCustomerActorAsync(user, ct);

        var found = await pets.FindWithOwnerAsync(petId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (isCustomer) OwnershipGuard.EnsureOwner(user, found.OwnerUserId);

        if (!found.Pet.IsActive) throw new BusinessException(ErrorCodes.NotFound);

        var applicable = await catalog.ListAsync(
            includeInactive: false, found.Pet.Species, found.Pet.SizeGroup, ct);

        var selected = applicable
            .Where(x => requestedIds.Contains(x.Service.ServiceId))
            .ToList();

        if (selected.Count != requestedIds.Count)
            throw new BusinessException(
                ErrorCodes.ValidationError,
                "Có dịch vụ không tồn tại, đã ngừng cung cấp hoặc không áp dụng cho loài và nhóm kích cỡ của thú cưng.");

        var services = selected
            .Select(x =>
            {
                var pricing = x.Pricing.Single();
                return new SelectedService(
                    x.Service.ServiceId,
                    x.Service.Name,
                    pricing.Price,
                    pricing.DurationMinutes,
                    pricing.StaffRequired,
                    x.Service.LatestStartTime);
            })
            .ToList();

        return new SpaSelection(found.Pet, services);
    }

    public async Task<SpaScheduleData> LoadSpaScheduleAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default)
    {
        var slotTimes = await catalog.GetSlotTimesAsync(ct);
        var bufferMinutes = await schedule.GetBufferMinutesAsync(ct);
        var shifts = await schedule.ListActiveSpaStaffShiftsAsync(rangeStart, rangeEnd, ct);
        var heldBookings = await schedule.ListHeldSpaBookingsAsync(rangeStart, rangeEnd, ct);

        return new SpaScheduleData(slotTimes, bufferMinutes, shifts, heldBookings);
    }

    public async Task<SpaSlotsResult> GetSpaSlotsAsync(
        CurrentUser user,
        DateOnly date,
        Guid petId,
        IReadOnlyCollection<Guid> serviceIds,
        CancellationToken ct = default)
    {
        var selection = await ResolveSpaSelectionAsync(user, petId, serviceIds, ct);

        var rangeStart = shopTimeZone.ToUtc(date, TimeOnly.MinValue);
        var bufferMinutes = await schedule.GetBufferMinutesAsync(ct);
        var rangeEnd = shopTimeZone.ToUtc(date.AddDays(1), TimeOnly.MinValue)
            .AddMinutes(selection.DurationMinutes + bufferMinutes);

        var data = await LoadSpaScheduleAsync(rangeStart, rangeEnd, ct);

        var candidates = data.SlotTimes
            .Select(time => new SlotCandidate(time, shopTimeZone.ToUtc(date, time)))
            .ToList();
        var shifts = data.Shifts
            .Select(x => new SlotStaffShift(x.StaffId, x.ShiftStart, x.ShiftEnd))
            .ToList();
        var held = data.HeldBookings
            .Select(x => new SlotHeldBooking(x.SlotStart, x.BusyUntil, x.StaffRequired))
            .ToList();

        var slots = SlotService
            .AvailableSlots(
                candidates,
                selection.LatestStartTime,
                selection.DurationMinutes,
                selection.StaffRequired,
                data.BufferMinutes,
                shifts,
                held)
            .Select(x => new SpaSlotItem(x.Time, SlotService.GroupOf(x.Time), x.Status))
            .ToList();

        return new SpaSlotsResult(
            selection.DurationMinutes, selection.StaffRequired, data.BufferMinutes, slots);
    }

    public async Task<SpaBookingResult> CreateSpaAppointmentAsync(
        CurrentUser user,
        Guid? customerId,
        Guid petId,
        IReadOnlyCollection<Guid> serviceIds,
        DateTimeOffset slotStart,
        CancellationToken ct = default)
    {
        var selection = await ResolveSpaSelectionAsync(user, petId, serviceIds, ct);

        if (user.Role != UserRole.Customer)
        {
            if (customerId is null || customerId == Guid.Empty)
                throw new BusinessException(ErrorCodes.ValidationError, "Lễ tân phải chọn khách hàng (customerId).");

            if (customerId != selection.Pet.CustomerId)
                throw new BusinessException(ErrorCodes.ValidationError, "Thú cưng không thuộc khách hàng này.");
        }

        if (user.Role == UserRole.Customer
            && await schedule.IsBookingLockedAsync(selection.Pet.CustomerId, ct))
            throw new BusinessException(ErrorCodes.BookingLocked);

        var slotStartUtc = slotStart.ToUniversalTime();
        var (day, localTime) = shopTimeZone.ToLocal(slotStartUtc);

        var slotTimes = await catalog.GetSlotTimesAsync(ct);
        if (!slotTimes.Contains(localTime))
            throw new BusinessException(
                ErrorCodes.ValidationError, "slotStart phải đúng một mốc giờ đặt lịch của cửa hàng.");

        var bufferMinutes = await schedule.GetBufferMinutesAsync(ct);
        var slotEnd = slotStartUtc.AddMinutes(selection.DurationMinutes);

        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            CustomerId = selection.Pet.CustomerId,
            PetId = selection.Pet.PetId,
            SizeGroup = selection.Pet.SizeGroup,
            SlotStart = slotStartUtc,
            SlotEnd = slotEnd,
            BusyUntil = slotEnd.AddMinutes(bufferMinutes),
            StaffRequired = (short)selection.StaffRequired,
        };

        await concurrency.RunAsync(async () =>
        {
            await concurrency.LockSpaDayAsync(day, ct);

            var data = await LoadSpaScheduleAsync(appointment.SlotStart, appointment.BusyUntil, ct);
            var shifts = data.Shifts
                .Select(x => new SlotStaffShift(x.StaffId, x.ShiftStart, x.ShiftEnd))
                .ToList();
            var held = data.HeldBookings
                .Select(x => new SlotHeldBooking(x.SlotStart, x.BusyUntil, x.StaffRequired))
                .ToList();

            var status = SlotService
                .AvailableSlots(
                    [new SlotCandidate(localTime, slotStartUtc)],
                    selection.LatestStartTime,
                    selection.DurationMinutes,
                    selection.StaffRequired,
                    bufferMinutes,
                    shifts,
                    held)
                .Single()
                .Status;

            if (status != SlotStatus.Available) throw new BusinessException(ErrorCodes.SlotFull);

            await schedule.AddSpaAppointmentAsync(
                appointment, selection.Services.Select(x => x.ServiceId).ToList(), ct);
        }, ct);

        return new SpaBookingResult(appointment, selection.Services.Sum(x => x.Price));
    }

    private async Task<bool> IsCustomerActorAsync(CurrentUser user, CancellationToken ct)
    {
        if (user.Role == UserRole.Customer) return true;

        if (user.Role == UserRole.Staff
            && await staffRoles.GetStaffRoleAsync(user.UserId, ct) == StaffRole.Receptionist)
            return false;

        throw new BusinessException(ErrorCodes.Forbidden);
    }
}
