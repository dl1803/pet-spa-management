using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Exceptions;
using PetSpa.Infrastructure.Persistence;

namespace PetSpa.Infrastructure.Identity;

// Adapter của port danh tính và token. Mật khẩu băm bằng PasswordHasher của Identity;
// refresh token chỉ lưu băm SHA-256 (token là chuỗi ngẫu nhiên 64 byte nên không cần băm chậm).
public sealed class IdentityTokenService(
    UserManager<AppUser> userManager,
    AppDbContext db,
    JwtOptions jwt) : IIdentityTokenService
{
    private DbSet<RefreshToken> Tokens => db.Set<RefreshToken>();

    public async Task<Guid?> ValidateCredentialsAsync(string userName, string password)
    {
        var user = await userManager.FindByNameAsync(userName);
        if (user is null || !user.IsActive) return null;

        return await userManager.CheckPasswordAsync(user, password) ? user.Id : null;
    }

    public async Task<TokenPair> IssueTokensAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || !user.IsActive) throw new BusinessException(ErrorCodes.Unauthenticated);

        return await IssueAsync(user, ct);
    }

    public async Task<TokenPair?> RotateAsync(string refreshToken, CancellationToken ct = default)
    {
        var hash = Hash(refreshToken);
        var stored = await Tokens.AsNoTracking().FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored is null) return null;

        // Token đã thu hồi mà vẫn bị gửi lại: nghi bị lộ, thu hồi mọi refresh token của tài khoản.
        if (stored.RevokedAt is not null)
        {
            await RevokeAllAsync(stored.UserId, ct);
            return null;
        }

        var now = DateTimeOffset.UtcNow;
        if (stored.ExpiresAt <= now) return null;

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == stored.UserId, ct);
        if (user is null || !user.IsActive) return null;

        // Thu hồi token cũ bằng cập nhật có điều kiện: nếu hai request cùng gửi một token, chỉ một request thắng.
        var claimed = await Tokens
            .Where(t => t.TokenId == stored.TokenId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, (DateTimeOffset?)now), ct);
        if (claimed == 0)
        {
            await RevokeAllAsync(stored.UserId, ct);
            return null;
        }

        return await IssueAsync(user, ct);
    }

    public Task RevokeAsync(string refreshToken, CancellationToken ct = default)
    {
        var hash = Hash(refreshToken);
        var now = DateTimeOffset.UtcNow;
        return Tokens
            .Where(t => t.TokenHash == hash && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, (DateTimeOffset?)now), ct);
    }

    public Task RevokeAllAsync(Guid userId, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        return Tokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, (DateTimeOffset?)now), ct);
    }

    public Task<bool> IsActiveAsync(Guid userId, CancellationToken ct = default) =>
        db.Users.AnyAsync(u => u.Id == userId && u.IsActive, ct);

    private async Task<TokenPair> IssueAsync(AppUser user, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

        Tokens.Add(new RefreshToken
        {
            TokenId = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = Hash(refreshToken),
            ExpiresAt = now.AddDays(jwt.RefreshTokenDays),
            CreatedAt = now,
        });
        await db.SaveChangesAsync(ct);

        return new TokenPair(CreateAccessToken(user, now), refreshToken);
    }

    private string CreateAccessToken(AppUser user, DateTimeOffset now)
    {
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(TokenClaims.UserId, user.Id.ToString()),
                new Claim(TokenClaims.Role, user.Role.ToString()),
            }),
            NotBefore = now.UtcDateTime,
            Expires = now.AddMinutes(jwt.AccessTokenMinutes).UtcDateTime,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
                SecurityAlgorithms.HmacSha256),
        };

        return new JsonWebTokenHandler().CreateToken(descriptor);
    }

    private static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
