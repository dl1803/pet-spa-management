namespace PetSpa.Application.Ports;

// Cặp token trả cho Web: { accessToken, refreshToken }.
public sealed record TokenPair(string AccessToken, string RefreshToken);

// Port "Danh tính và token" (SA 3.1): adapter hiện thực bằng ASP.NET Core Identity + JWT.
public interface IIdentityTokenService
{
    // Kiểm tra tên đăng nhập và mật khẩu. Trả UserId nếu hợp lệ;
    // trả null nếu không tồn tại, IsActive = false hoặc sai mật khẩu (không nêu trường nào sai).
    Task<Guid?> ValidateCredentialsAsync(string userName, string password);

    // Cấp access token (UserId, Role) và refresh token (lưu băm). Tài khoản không tồn tại hoặc bị vô hiệu hóa: ném 401.
    Task<TokenPair> IssueTokensAsync(Guid userId, CancellationToken ct = default);

    // Làm mới: đối chiếu băm, chưa thu hồi, chưa hết hạn, tài khoản còn hoạt động; thu hồi token cũ, cấp cặp mới.
    // Trả null nếu không hợp lệ. Token đã thu hồi bị gửi lại: thu hồi mọi refresh token của tài khoản.
    Task<TokenPair?> RotateAsync(string refreshToken, CancellationToken ct = default);

    // Thu hồi một refresh token (đăng xuất).
    Task RevokeAsync(string refreshToken, CancellationToken ct = default);

    // Thu hồi mọi refresh token của tài khoản (vô hiệu hóa tài khoản, phát hiện dùng lại token).
    Task RevokeAllAsync(Guid userId, CancellationToken ct = default);

    // Tài khoản còn hoạt động (AppUser.IsActive), dùng để kiểm tra ở mỗi request đã xác thực.
    Task<bool> IsActiveAsync(Guid userId, CancellationToken ct = default);
}
