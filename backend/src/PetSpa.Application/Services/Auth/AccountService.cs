using PetSpa.Application.Common;
using PetSpa.Application.Ports;

namespace PetSpa.Application.Services.Auth;

// Nhóm Auth (Backend-Conventions 3.2): đăng ký, thông tin cá nhân, khách vãng lai.
public sealed class AccountService(IAccountRepository accounts)
{
    // FR-ACC-01: Role luôn là Customer do adapter đặt, không nhận từ client.
    public Task<Guid> RegisterAsync(
        string userName, string fullName, string password, string? email, CancellationToken ct = default) =>
        accounts.CreateCustomerAccountAsync(
            PhoneNumber.Normalize(userName), fullName.Trim(), NormalizeEmail(email), password, ct);

    private static string? NormalizeEmail(string? email) =>
        string.IsNullOrWhiteSpace(email) ? null : email.Trim();
}

