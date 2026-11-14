using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Booking;

public sealed record HotelAvailabilityResult(bool Available, int Nights, decimal EstimatedAmount);

public sealed record HotelBookingResult(HotelAppointment Appointment, int Nights, decimal EstimatedAmount);

public sealed class HotelBookingService(
    IPetRepository pets,
    IStaffRoleReader staffRoles,
    IHotelBookingRepository hotelBookings,
    IHotelCatalogRepository hotelCatalog,
    ShopTimeZone shopTimeZone,
    IConcurrencyGuard concurrency)
{
    private sealed record StayQuote(int Nights, decimal Amount);

    public async Task<bool> HasCapacityAsync(
        CurrentUser user, Guid petId, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default)
    {
        var found = await pets.FindWithOwnerAsync(petId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        await EnsureCanViewPetAsync(user, found, ct);

        if (!found.Pet.IsActive) throw new BusinessException(ErrorCodes.NotFound);

        return await HasCapacityForGroupAsync(found.Pet.Species, found.Pet.SizeGroup, checkIn, checkOut, ct);
    }

    public async Task<HotelAvailabilityResult> GetAvailabilityAsync(
        CurrentUser user, Guid petId, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default)
    {
        var found = await pets.FindWithOwnerAsync(petId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        await EnsureCanViewPetAsync(user, found, ct);

        if (!found.Pet.IsActive) throw new BusinessException(ErrorCodes.NotFound);

        var available = await HasCapacityForGroupAsync(found.Pet.Species, found.Pet.SizeGroup, checkIn, checkOut, ct);
        var quote = await QuoteStayAsync(found.Pet, checkIn, checkOut, ct);

        return new HotelAvailabilityResult(available, quote.Nights, quote.Amount);
    }

    public async Task<HotelBookingResult> CreateHotelAppointmentAsync(
        CurrentUser user,
        Guid? customerId,
        Guid petId,
        DateTimeOffset plannedCheckIn,
        DateTimeOffset plannedCheckOut,
        CancellationToken ct = default)
    {
        var isCustomer = await IsCustomerActorAsync(user, ct);

        var found = await pets.FindWithOwnerAsync(petId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (isCustomer) OwnershipGuard.EnsureOwner(user, found.OwnerUserId);

        if (!found.Pet.IsActive) throw new BusinessException(ErrorCodes.NotFound);

        var pet = found.Pet;

        if (!isCustomer)
        {
            if (customerId is null || customerId == Guid.Empty)
                throw new BusinessException(ErrorCodes.ValidationError, "Lễ tân phải chọn khách hàng (customerId).");

            if (customerId != pet.CustomerId)
                throw new BusinessException(ErrorCodes.ValidationError, "Thú cưng không thuộc khách hàng này.");
        }
        else if (await hotelBookings.IsBookingLockedAsync(pet.CustomerId, ct))
        {
            throw new BusinessException(ErrorCodes.BookingLocked);
        }

        var checkIn = plannedCheckIn.ToUniversalTime();
        var checkOut = plannedCheckOut.ToUniversalTime();

        var (checkInDate, _) = shopTimeZone.ToLocal(checkIn);
        var (today, _) = shopTimeZone.ToLocal(DateTimeOffset.UtcNow);

        if (checkIn <= DateTimeOffset.UtcNow || checkInDate < today)
            throw new BusinessException(
                ErrorCodes.ValidationError, "Không thể đặt lịch ở thời điểm trong quá khứ.");

        var (checkOutDate, _) = shopTimeZone.ToLocal(checkOut);
        if (checkOutDate <= checkInDate)
            throw new BusinessException(
                ErrorCodes.ValidationError, "Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.");

        var quote = await QuoteStayAsync(pet, checkIn, checkOut, ct);

        var appointment = new HotelAppointment
        {
            AppointmentId = Guid.NewGuid(),
            CustomerId = pet.CustomerId,
            PetId = pet.PetId,
            SizeGroup = pet.SizeGroup,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkOut,
        };

        await concurrency.RunAsync(async () =>
        {
            await concurrency.LockHotelGroupAsync(pet.Species, pet.SizeGroup, ct);

            if (isCustomer && await hotelBookings.IsBookingLockedAsync(pet.CustomerId, ct))
                throw new BusinessException(ErrorCodes.BookingLocked);

            if (!await HasCapacityForGroupAsync(pet.Species, pet.SizeGroup, checkIn, checkOut, ct))
                throw new BusinessException(ErrorCodes.NoCapacity);

            await hotelBookings.AddHotelAppointmentAsync(appointment, ct);
        }, ct);

        return new HotelBookingResult(appointment, quote.Nights, quote.Amount);
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

    private async Task<StayQuote> QuoteStayAsync(
        Pet pet, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct)
    {
        var checkInDate = shopTimeZone.ToLocal(checkIn).Date;
        var checkOutDate = shopTimeZone.ToLocal(checkOut).Date;

        if (checkOutDate <= checkInDate)
            throw new BusinessException(
                ErrorCodes.ValidationError, "Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.");

        var pricing = await hotelCatalog.ListPricingAsync(ct);
        var amount = PricingService.StayAmount(pet.Species, pet.SizeGroup, checkInDate, checkOutDate, pricing);

        return new StayQuote(checkOutDate.DayNumber - checkInDate.DayNumber, amount);
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

