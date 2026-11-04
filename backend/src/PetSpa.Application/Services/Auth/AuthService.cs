using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Auth;

// UC-02 / SD-01: đăng nhập qua port danh tính và token.
public sealed class AuthService(IIdentityTokenService identity)
{
    // Không tồn tại, IsActive = false hoặc sai mật khẩu đều trả cùng một lỗi, không nêu trường sai.
    // Log đăng nhập thất bại do ExceptionHandlingMiddleware ghi (ID 59), không ghi mật khẩu.
    public async Task<TokenPair> LoginAsync(string userName, string password, CancellationToken ct = default)
    {
        var userId = await identity.ValidateCredentialsAsync(PhoneNumber.Normalize(userName), password);
        if (userId is null)
            throw new BusinessException(ErrorCodes.Unauthenticated, "Thông tin đăng nhập không đúng.");

        return await identity.IssueTokensAsync(userId.Value, ct);
    }
}

