namespace PetSpa.Infrastructure.Identity;

// Cấu hình JWT, đọc từ mục "Jwt":
// Jwt__SigningKey (bí mật, chỉ ở biến môi trường), Jwt__AccessTokenMinutes, Jwt__RefreshTokenDays.
public sealed class JwtOptions
{
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; }
    public int RefreshTokenDays { get; set; }
}

