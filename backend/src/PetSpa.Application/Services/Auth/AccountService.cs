using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Auth;

// Nhóm Auth (Backend-Conventions 3.2): đăng ký, thông tin cá nhân, khách vãng lai.
public sealed class AccountService(IAccountRepository accounts)
{
    // FR-ACC-01: Role luôn là Customer do adapter đặt, không nhận từ client.
    public Task<Guid> RegisterAsync(
        string userName, string fullName, string password, string? email, CancellationToken ct = default) =>
        accounts.CreateCustomerAccountAsync(
            PhoneNumber.Normalize(userName), fullName.Trim(), NormalizeEmail(email), password, ct);

    // FR-ACC-03: tài khoản lấy từ token, không nhận id từ client (BR-16).
    public async Task<MeProfile> GetMeAsync(CurrentUser user, CancellationToken ct = default) =>
        await accounts.GetMeAsync(user.UserId, ct) ?? throw new BusinessException(ErrorCodes.Unauthenticated);

    public async Task UpdateMeAsync(
        CurrentUser user, string? fullName, string? phone, string? email, CancellationToken ct = default)
    {
        switch (user.Role)
        {
            case UserRole.Customer:
                await accounts.UpdateCustomerProfileAsync(
                    user.UserId,
                    RequireFullName(fullName),
                    phone is null ? null : PhoneNumber.Normalize(phone),
                    NormalizeEmail(email),
                    ct);
                break;
            case UserRole.Staff:
                // phone và email chỉ áp dụng cho khách hàng (API-Notes mục 8 #10).
                await accounts.UpdateStaffFullNameAsync(user.UserId, RequireFullName(fullName), ct);
                break;
            // Manager: AppUser không có họ tên nên không có gì để cập nhật.
        }
    }

    // fullName bắt buộc với khách hàng và nhân viên; quản lý bỏ qua (API-Notes mục 8 #10).
    private static string RequireFullName(string? fullName) =>
        string.IsNullOrWhiteSpace(fullName)
            ? throw new BusinessException(ErrorCodes.ValidationError, "Vui lòng nhập họ tên.")
            : fullName.Trim();

    private static string? NormalizeEmail(string? email) =>
        string.IsNullOrWhiteSpace(email) ? null : email.Trim();
}
