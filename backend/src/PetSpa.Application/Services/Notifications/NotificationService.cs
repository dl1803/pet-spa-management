using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Notifications;

// Một trang thông báo kèm tổng số chưa đọc (khớp NotificationPage trong openapi).
public sealed record NotificationListResult(PagedResult<Notification> Notifications, int Unread);

// Nhóm Notification (UC-34, BP-10): lưu, xem và đánh dấu đã đọc thông báo.
// Vai trò (chỉ Khách hàng và Nhân viên spa) do policy ở API chặn; ở đây kiểm tra sở hữu (BR-16).
public sealed class NotificationService(INotificationRepository notifications)
{
    // Lưu thông báo. Các luồng nghiệp vụ gọi sau khi commit (ID 97 gắn vào từng sự kiện).
    // message tối đa 500 ký tự (cột Notification.Message); người gọi soạn nội dung trong giới hạn này.
    public Task<Guid> CreateAsync(
        Guid recipientUserId, NotificationType type, Guid? appointmentId, string message,
        CancellationToken ct = default) =>
        notifications.AddAsync(recipientUserId, type, appointmentId, message, ct);

    // Chỉ thông báo gửi cho chính người gọi (UserId lấy từ token).
    public async Task<NotificationListResult> ListAsync(
        CurrentUser user, int page, int pageSize, CancellationToken ct = default)
    {
        var result = await notifications.ListByRecipientAsync(user.UserId, page, pageSize, ct);
        var unread = await notifications.CountUnreadAsync(user.UserId, ct);
        return new NotificationListResult(result, unread);
    }

    public async Task MarkReadAsync(CurrentUser user, Guid notificationId, CancellationToken ct = default)
    {
        var recipientUserId = await notifications.FindRecipientUserIdAsync(notificationId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        // Thông báo của người khác -> 403 FORBIDDEN, không trả thông tin.
        OwnershipGuard.EnsureOwner(user, recipientUserId);

        await notifications.MarkReadAsync(notificationId, ct);
    }
}
