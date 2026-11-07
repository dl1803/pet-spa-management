using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Booking;

public sealed class BookingService(
    IPetRepository pets,
    IStaffRoleReader staffRoles,
    IServiceCatalogRepository catalog,
    ISpaScheduleRepository schedule)
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

    private async Task<bool> IsCustomerActorAsync(CurrentUser user, CancellationToken ct)
    {
        if (user.Role == UserRole.Customer) return true;

        if (user.Role == UserRole.Staff
            && await staffRoles.GetStaffRoleAsync(user.UserId, ct) == StaffRole.Receptionist)
            return false;

        throw new BusinessException(ErrorCodes.Forbidden);
    }
}

