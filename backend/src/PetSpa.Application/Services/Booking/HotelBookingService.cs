using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Booking;

public sealed class HotelBookingService(
    IPetRepository pets,
    IStaffRoleReader staffRoles,
    IHotelBookingRepository hotelBookings,
    ShopTimeZone shopTimeZone)
{
    public async Task<bool> HasCapacityAsync(
        CurrentUser user, Guid petId, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default)
    {
        var found = await pets.FindWithOwnerAsync(petId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        await EnsureCanViewPetAsync(user, found, ct);

        if (!found.Pet.IsActive) throw new BusinessException(ErrorCodes.NotFound);

        return await HasCapacityForGroupAsync(found.Pet.Species, found.Pet.SizeGroup, checkIn, checkOut, ct);
    }

    private async Task EnsureCanViewPetAsync(CurrentUser user, PetWithOwner found, CancellationToken ct)
    {
        if (user.Role == UserRole.Manager) return;

        if (user.Role == UserRole.Customer)
        {
            OwnershipGuard.EnsureOwner(user, found.OwnerUserId);
            return;
        }

        if (user.Role == UserRole.Staff
            && await staffRoles.GetStaffRoleAsync(user.UserId, ct) == StaffRole.Receptionist)
            return;

        throw new BusinessException(ErrorCodes.Forbidden);
    }

    private async Task<bool> HasCapacityForGroupAsync(
        Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct)
    {
        var checkInDate = shopTimeZone.ToLocal(checkIn).Date;
        var checkOutDate = shopTimeZone.ToLocal(checkOut).Date;

        if (checkOutDate <= checkInDate)
            throw new BusinessException(
                ErrorCodes.ValidationError, "Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.");

        var activeCages = await hotelBookings.CountActiveCagesAsync(species, sizeGroup, ct);
        var heldStays = await hotelBookings.ListHeldHotelStaysAsync(species, sizeGroup, checkIn, checkOut, ct);

        var stays = heldStays
            .Select(x => new SlotHeldStay(
                shopTimeZone.ToLocal(x.PlannedCheckIn).Date,
                shopTimeZone.ToLocal(x.PlannedCheckOut).Date))
            .ToList();

        return SlotService.AvailableCages(activeCages, stays, checkInDate, checkOutDate) >= 1;
    }
}

