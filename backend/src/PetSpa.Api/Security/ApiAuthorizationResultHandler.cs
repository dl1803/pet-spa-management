using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Security;

// Đổi kết quả "chưa xác thực" / "không đủ quyền" của middleware phân quyền thành BusinessException,
// để ExceptionHandlingMiddleware trả error envelope chuẩn: 401 UNAUTHENTICATED, 403 FORBIDDEN.
public sealed class ApiAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _default = new();

    public Task HandleAsync(
        RequestDelegate next,
        HttpContext context,
        AuthorizationPolicy policy,
        PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Challenged) throw new BusinessException(ErrorCodes.Unauthenticated);
        if (authorizeResult.Forbidden) throw new BusinessException(ErrorCodes.Forbidden);

        return _default.HandleAsync(next, context, policy, authorizeResult);
    }
}
