using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

// Port "Giao dịch và khóa đồng thời" (BR-18, R-04; Technical Architecture DL-06 -> DL-09).
// Cách dùng (Backend-Conventions 7.2): Application kiểm tra quyền và tính hợp lệ nghiệp vụ trước,
// rồi gọi RunAsync; bên trong lấy khóa, ĐỌC LẠI điều kiện, rồi ghi.
// - Ném lỗi trong work hoặc vi phạm ràng buộc CSDL -> hoàn tác cả giao dịch.
// - Vi phạm ràng buộc chống trùng nhân viên / chuồng của CSDL -> 409 STAFF_CONFLICT / CAGE_CONFLICT.
// - Repository gọi bên trong work không được tự mở giao dịch (đã có giao dịch của RunAsync).
// - Phải đọc lại dữ liệu SAU khi lấy khóa; không dùng thực thể đã nạp trước đó (DbContext giữ bản cũ).
// - Cần nhiều loại khóa trong một giao dịch thì lấy khóa tư vấn trước, khóa dòng sau.
public interface IConcurrencyGuard
{
    // Chạy work trong một giao dịch: xong thì commit, ném lỗi thì rollback.
    Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default);

    Task RunAsync(Func<Task> work, CancellationToken ct = default);

    // Các hàm khóa dưới đây chỉ dùng bên trong RunAsync; khóa tự nhả khi giao dịch kết thúc.

    // Đặt lịch spa (BR-13): các giao dịch cùng ngày chạy lần lượt. day là ngày theo múi giờ cửa hàng, do Application tính.
    Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default);

    // Đặt lịch lưu trú (BR-21): các giao dịch cùng loài và nhóm kích cỡ chạy lần lượt để đếm lại chuồng trống.
    Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default);

    // Xác nhận phân công nhân viên / gán chuồng (BR-04, BR-21): khóa dòng lịch hẹn (SELECT ... FOR UPDATE).
    Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default);
}
