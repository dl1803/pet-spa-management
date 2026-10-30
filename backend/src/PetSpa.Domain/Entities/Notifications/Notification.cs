using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Entities;

public class Notification
{
    public Guid NotificationId { get; set; }
    public Guid RecipientUserId { get; set; }
    public NotificationType Type { get; set; }
    public Guid? AppointmentId { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

