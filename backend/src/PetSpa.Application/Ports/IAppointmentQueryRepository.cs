using PetSpa.Application.Common;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

// Một dòng danh sách lịch hẹn kèm tên thú cưng để hiển thị (API-Notes mục 8 #2).
public sealed record AppointmentListItem(Appointment Appointment, string PetName);

// Port đọc lịch hẹn (UC-11). Chỉ đọc, không ghi.
public interface IAppointmentQueryRepository
{
    // Lịch hẹn của khách hàng có tài khoản (Customer.UserId = customerUserId), mới tạo trước.
    Task<PagedResult<AppointmentListItem>> ListByCustomerUserAsync(
        Guid customerUserId, AppointmentType? type, AppointmentStatus? status, int page, int pageSize,
        CancellationToken ct = default);
}

