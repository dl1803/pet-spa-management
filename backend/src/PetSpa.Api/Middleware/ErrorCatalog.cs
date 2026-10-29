using PetSpa.Api.Dtos;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Middleware;

// Bảng mã lỗi chuẩn hóa: mã lỗi -> HTTP status, title và detail mặc định 
internal static class ErrorCatalog
{
    private sealed record Entry(int Status, string Title, string Detail);

    private static readonly Dictionary<string, Entry> Entries = new()
    {
        // 400
        [ErrorCodes.ValidationError] = new(StatusCodes.Status400BadRequest, "Dữ liệu không hợp lệ", "Vui lòng kiểm tra lại thông tin đã nhập."),

        // 401
        [ErrorCodes.Unauthenticated] = new(StatusCodes.Status401Unauthorized, "Chưa xác thực", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."),

        // 403
        [ErrorCodes.Forbidden] = new(StatusCodes.Status403Forbidden, "Không có quyền truy cập", "Bạn không có quyền thực hiện thao tác này."),
        [ErrorCodes.BookingLocked] = new(StatusCodes.Status403Forbidden, "Tài khoản bị khóa đặt lịch", "Tài khoản của bạn tạm thời không thể tự đặt lịch. Vui lòng liên hệ hotline để được hỗ trợ."),

        // 404
        [ErrorCodes.NotFound] = new(StatusCodes.Status404NotFound, "Không tìm thấy", "Không tìm thấy dữ liệu được yêu cầu."),

        // 409
        [ErrorCodes.DuplicateContact] = new(StatusCodes.Status409Conflict, "Thông tin liên hệ đã tồn tại", "Số điện thoại này đã được sử dụng."),
        [ErrorCodes.SlotFull] = new(StatusCodes.Status409Conflict, "Khung giờ đã kín", "Vui lòng chọn khung giờ khác."),
        [ErrorCodes.NoCapacity] = new(StatusCodes.Status409Conflict, "Hết chỗ lưu trú", "Hết chỗ trong thời gian này, vui lòng chọn ngày khác."),
        [ErrorCodes.StaffConflict] = new(StatusCodes.Status409Conflict, "Nhân viên bị trùng lịch", "Nhân viên đã có lịch hẹn khác trong khoảng thời gian này."),
        [ErrorCodes.CageConflict] = new(StatusCodes.Status409Conflict, "Chuồng không khả dụng", "Chuồng đã được gán cho lịch khác hoặc không phù hợp với thú cưng."),
        [ErrorCodes.InvalidTransition] = new(StatusCodes.Status409Conflict, "Sai trình tự trạng thái", "Không thể chuyển lịch hẹn sang trạng thái này ở thời điểm hiện tại."),
        [ErrorCodes.ChangeWindowClosed] = new(StatusCodes.Status409Conflict, "Đã quá thời hạn đổi hoặc hủy", "Đã quá thời hạn tự đổi/hủy, vui lòng liên hệ hotline để được hỗ trợ."),
        [ErrorCodes.PhotoRequired] = new(StatusCodes.Status409Conflict, "Thiếu ảnh minh chứng", "Cần có ảnh trước/sau hợp lệ để thực hiện thao tác này."),
        [ErrorCodes.ServicesIncomplete] = new(StatusCodes.Status409Conflict, "Chưa hoàn thành dịch vụ", "Cần hoàn thành tất cả dịch vụ trong lịch hẹn trước khi hoàn tất."),
        [ErrorCodes.StaffCountMismatch] = new(StatusCodes.Status409Conflict, "Sai số lượng nhân viên", "Số nhân viên được chọn không khớp với số nhân viên cần cho lịch hẹn."),
        [ErrorCodes.ShiftOverlap] = new(StatusCodes.Status409Conflict, "Ca làm việc bị chồng", "Ca làm việc bị chồng thời gian với ca khác của nhân viên."),
        [ErrorCodes.ShiftHasAppointments] = new(StatusCodes.Status409Conflict, "Ca làm việc còn lịch hẹn", "Ca làm việc còn lịch hẹn đã xác nhận trong khoảng thời gian bị bỏ."),
        [ErrorCodes.CostConfirmationPending] = new(StatusCodes.Status409Conflict, "Đang chờ xác nhận chi phí", "Cần chờ khách hàng xác nhận chi phí mới trước khi tiếp tục."),
        [ErrorCodes.PaymentNotDue] = new(StatusCodes.Status409Conflict, "Sai thời điểm thanh toán", "Chưa đến thời điểm thanh toán hoặc khoản thanh toán cần thiết chưa được thanh toán."),
        [ErrorCodes.AmountMismatch] = new(StatusCodes.Status409Conflict, "Số tiền không đủ", "Số tiền nhận thấp hơn số tiền cần thanh toán."),
        [ErrorCodes.StaffOutOfShift] = new(StatusCodes.Status409Conflict, "Nhân viên ngoài ca", "Nhân viên được chọn không có ca làm trong khoảng thời gian này."),
        [ErrorCodes.CustomerNotLocked] = new(StatusCodes.Status409Conflict, "Khách hàng không bị khóa", "Khách hàng này hiện không bị khóa quyền tự đặt lịch."),
        [ErrorCodes.DuplicateCageCode] = new(StatusCodes.Status409Conflict, "Mã chuồng đã tồn tại", "Vui lòng nhập mã chuồng khác."),
        [ErrorCodes.CostConfirmationExpired] = new(StatusCodes.Status409Conflict, "Yêu cầu xác nhận chi phí đã hết hạn", "Yêu cầu xác nhận chi phí mới đã hết hạn."),

        // 429
        [ErrorCodes.RateLimited] = new(StatusCodes.Status429TooManyRequests, "Quá nhiều yêu cầu", "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút."),
    };

    // Trả về null nếu mã lỗi chưa được khai báo trong bảng.
    public static ErrorResponse? Create(string code, string? detail = null) =>
        Entries.TryGetValue(code, out var entry)
            ? new ErrorResponse(entry.Status, code, entry.Title, detail ?? entry.Detail)
            : null;

    // Lỗi hệ thống 500: không lộ chi tiết nội bộ
    public static ErrorResponse Internal() =>
        new(StatusCodes.Status500InternalServerError, null, "Lỗi hệ thống", "Có lỗi xảy ra, vui lòng thử lại sau.");
}

