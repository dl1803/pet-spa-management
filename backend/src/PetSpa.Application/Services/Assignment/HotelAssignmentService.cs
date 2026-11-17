using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

public sealed record HotelCageSuggestionResult(Cage? Cage);

public sealed class HotelAssignmentService(IHotelAssignmentRepository hotelAssignments, ShopTimeZone shopTimeZone)
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
}

