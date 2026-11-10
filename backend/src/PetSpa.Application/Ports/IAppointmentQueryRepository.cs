using PetSpa.Application.Common;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

// Một dòng danh sách lịch hẹn kèm tên thú cưng để hiển thị (API-Notes mục 8 #2).
public sealed record AppointmentListItem(Appointment Appointment, string PetName);

// Dịch vụ của một lịch spa kèm tên dịch vụ (API-Notes mục 8 #2).
public sealed record AppointmentServiceLine(Guid ServiceId, string Name, bool IsDone, DateTimeOffset? DoneAt, string? Note);

// Nhân viên được phân công cho một lịch spa kèm họ tên (API-Notes mục 8 #2).
public sealed record AppointmentStaffLine(Guid StaffId, string FullName, bool IsHolding, DateTimeOffset AssignedAt);

// Chi tiết một lịch hẹn; OwnerUserId là tài khoản của khách sở hữu (null nếu khách vãng lai) để kiểm tra BR-16.
public sealed record AppointmentDetailData(
    Appointment Appointment,
    Guid? OwnerUserId,
    string PetName,
    IReadOnlyList<AppointmentServiceLine> Services,
    IReadOnlyList<AppointmentStaffLine> Staff);

// Port đọc lịch hẹn (UC-11). Chỉ đọc, không ghi.
public interface IAppointmentQueryRepository
{
    // Lịch hẹn của khách hàng có tài khoản (Customer.UserId = customerUserId), mới tạo trước.
    Task<PagedResult<AppointmentListItem>> ListByCustomerUserAsync(
        Guid customerUserId, AppointmentType? type, AppointmentStatus? status, int page, int pageSize,
        CancellationToken ct = default);

    // Chi tiết một lịch hẹn theo id; null nếu không có. Lịch lưu trú trả hai danh sách rỗng.
    Task<AppointmentDetailData?> FindDetailAsync(Guid appointmentId, CancellationToken ct = default);
}

