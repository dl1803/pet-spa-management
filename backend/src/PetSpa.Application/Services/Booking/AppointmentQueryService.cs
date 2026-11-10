using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Booking;

// UC-11 (FR-BOOK-04, FR-BOOK-05): khách hàng xem lịch hẹn và lịch sử của mình (BR-16).
public sealed class AppointmentQueryService(IAppointmentQueryRepository appointments)
{
    public async Task<PagedResult<AppointmentListItem>> ListAsync(
        CurrentUser user, AppointmentType? type, AppointmentStatus? status, int page, int pageSize,
        CancellationToken ct = default)
    {
        EnsureCustomer(user);

        return await appointments.ListByCustomerUserAsync(user.UserId, type, status, page, pageSize, ct);
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

    // Lễ tân, nhân viên spa, quản lý xem lịch hẹn theo phạm vi riêng ở việc khác (ID 77).
    private static void EnsureCustomer(CurrentUser user)
    {
        if (user.Role != UserRole.Customer) throw new BusinessException(ErrorCodes.Forbidden);
    }
}

