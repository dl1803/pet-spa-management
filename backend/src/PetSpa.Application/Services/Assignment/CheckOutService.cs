using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Assignment;

public sealed record HotelReturnTarget(HotelAppointment Stay, DateTimeOffset ReturnedAt);

public sealed class CheckOutService(
    IHotelAssignmentRepository hotelAssignments,
    IStaffRoleReader staffRoles)
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

    private async Task EnsureReceptionistOrManagerAsync(CurrentUser user, CancellationToken ct)
    {
        if (user.Role == UserRole.Manager) return;

        if (user.Role == UserRole.Staff
            && await staffRoles.GetStaffRoleAsync(user.UserId, ct) == StaffRole.Receptionist)
            return;

        throw new BusinessException(ErrorCodes.Forbidden);
    }
}
