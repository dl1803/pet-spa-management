using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

// GET /notifications?page=&pageSize=
public sealed class ListNotificationsQuery
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

// Không trả RecipientUserId (khớp schema Notification trong openapi).
public sealed record NotificationResponse(
    Guid NotificationId,
    NotificationType Type,
    Guid? AppointmentId,
    string Message,
    bool IsRead,
    DateTimeOffset CreatedAt)
{
    public static NotificationResponse From(Notification n) => new(
        n.NotificationId,
        n.Type,
        n.AppointmentId,
        n.Message,
        n.IsRead,
        n.CreatedAt);
}

// Trang thông báo: page, pageSize, total, items kèm unread (tổng chưa đọc của người gọi).
public sealed record NotificationPageResponse(
    IReadOnlyList<NotificationResponse> Items,
    int Page,
    int PageSize,
    int Total,
    int Unread);
