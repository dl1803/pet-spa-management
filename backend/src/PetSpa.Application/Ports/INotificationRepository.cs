using PetSpa.Application.Common;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public interface INotificationRepository
{
    // Lưu một thông báo mới (chưa đọc). Trả NotificationId.
    Task<Guid> AddAsync(
        Guid recipientUserId, NotificationType type, Guid? appointmentId, string message,
        CancellationToken ct = default);

    // Thông báo của một người nhận, mới nhất trước.
    Task<PagedResult<Notification>> ListByRecipientAsync(
        Guid recipientUserId, int page, int pageSize, CancellationToken ct = default);

    // Tổng số thông báo chưa đọc của người nhận (không phụ thuộc trang).
    Task<int> CountUnreadAsync(Guid recipientUserId, CancellationToken ct = default);

    // Người nhận của thông báo; null nếu không có thông báo này.
    Task<Guid?> FindRecipientUserIdAsync(Guid notificationId, CancellationToken ct = default);

    // Đánh dấu đã đọc. Thông báo đã đọc rồi thì giữ nguyên.
    Task MarkReadAsync(Guid notificationId, CancellationToken ct = default);
}
