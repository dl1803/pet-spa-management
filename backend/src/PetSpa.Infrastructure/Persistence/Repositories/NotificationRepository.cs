using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

// Adapter của INotificationRepository.
public sealed class NotificationRepository(AppDbContext db) : INotificationRepository
{
    public async Task<Guid> AddAsync(
        Guid recipientUserId, NotificationType type, Guid? appointmentId, string message,
        CancellationToken ct = default)
    {
        // IsRead = false và CreatedAt = UtcNow là giá trị mặc định của entity.
        var notification = new Notification
        {
            NotificationId = Guid.NewGuid(),
            RecipientUserId = recipientUserId,
            Type = type,
            AppointmentId = appointmentId,
            Message = message,
        };
        db.Set<Notification>().Add(notification);
        await db.SaveChangesAsync(ct);
        return notification.NotificationId;
    }

    public async Task<PagedResult<Notification>> ListByRecipientAsync(
        Guid recipientUserId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.Set<Notification>().AsNoTracking()
            .Where(n => n.RecipientUserId == recipientUserId);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.NotificationId)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<Notification>(items, page, pageSize, total);
    }

    public Task<int> CountUnreadAsync(Guid recipientUserId, CancellationToken ct = default) =>
        db.Set<Notification>().CountAsync(n => n.RecipientUserId == recipientUserId && !n.IsRead, ct);

    public Task<Guid?> FindRecipientUserIdAsync(Guid notificationId, CancellationToken ct = default) =>
        db.Set<Notification>().AsNoTracking()
            .Where(n => n.NotificationId == notificationId)
            .Select(n => (Guid?)n.RecipientUserId)
            .FirstOrDefaultAsync(ct);

    public Task MarkReadAsync(Guid notificationId, CancellationToken ct = default) =>
        db.Set<Notification>()
            .Where(n => n.NotificationId == notificationId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
}
