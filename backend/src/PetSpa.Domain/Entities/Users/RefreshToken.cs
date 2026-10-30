namespace PetSpa.Domain.Entities;

// Refresh token lưu dạng băm để thu hồi được. Không bao giờ lưu token thô.
public class RefreshToken
{
    public Guid TokenId { get; set; }
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

