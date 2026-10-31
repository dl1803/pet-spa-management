using System.Security.Claims;
using PetSpa.Application.Security;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Security;

public static class ClaimsPrincipalExtensions
{
    // Danh tính lấy từ token đã xác thực, không nhận từ client.
    // Thiếu hoặc sai claim -> 401 (mặc định từ chối).
    public static CurrentUser ToCurrentUser(this ClaimsPrincipal principal)
    {
        var userIdText = principal.FindFirst(TokenClaims.UserId)?.Value;
        var roleText = principal.FindFirst(TokenClaims.Role)?.Value;

        if (!Guid.TryParse(userIdText, out var userId)
            || !Enum.TryParse<UserRole>(roleText, false, out var role)
            || !Enum.IsDefined(role))
        {
            throw new BusinessException(ErrorCodes.Unauthenticated);
        }

        return new CurrentUser(userId, role);
    }
}
