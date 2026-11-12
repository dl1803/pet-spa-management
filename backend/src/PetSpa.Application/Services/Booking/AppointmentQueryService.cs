using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Booking;

// UC-11 (FR-BOOK-04, FR-BOOK-05): khách hàng xem lịch hẹn và lịch sử của mình (BR-16).
public sealed class AppointmentQueryService(IAppointmentQueryRepository appointments, IPetRepository pets)
{
    public async Task<PagedResult<AppointmentListItem>> ListAsync(
        CurrentUser user, AppointmentType? type, AppointmentStatus? status, Guid? petId, int page, int pageSize,
        CancellationToken ct = default)
    {
        if (user.Role == UserRole.Manager)
            return await appointments.ListAllAsync(type, status, petId, page, pageSize, ct);

        EnsureCustomer(user);

        // Xem lịch sử theo thú cưng (FR-BOOK-05): thú cưng phải thuộc khách đang đăng nhập (BR-16).
        if (petId is { } requestedPetId)
        {
            var pet = await pets.FindWithOwnerAsync(requestedPetId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            OwnershipGuard.EnsureOwner(user, pet.OwnerUserId);
        }

        return await appointments.ListByCustomerUserAsync(user.UserId, type, status, petId, page, pageSize, ct);
    }

    public async Task<AppointmentDetailData> GetAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        EnsureCustomer(user);

        var detail = await appointments.FindDetailAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        // Lịch của khách khác -> 403 FORBIDDEN, không trả thông tin (BR-16, kể cả khi truy cập bằng id).
        OwnershipGuard.EnsureOwner(user, detail.OwnerUserId);

        return detail;
    }

    // Lễ tân, nhân viên spa xem lịch hẹn theo phạm vi riêng ở việc khác (ID 77).
    private static void EnsureCustomer(CurrentUser user)
    {
        if (user.Role != UserRole.Customer) throw new BusinessException(ErrorCodes.Forbidden);
    }
}

