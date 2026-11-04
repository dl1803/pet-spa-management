namespace PetSpa.Application.Ports;

// Port truy cập dữ liệu tài khoản và hồ sơ khách hàng/nhân viên (Backend-Conventions 3.3).
public interface IAccountRepository
{
    // Tạo AppUser (Role = Customer) và Customer trong một giao dịch.
    // Trùng số điện thoại -> DUPLICATE_CONTACT; mật khẩu không đạt -> VALIDATION_ERROR.
    Task<Guid> CreateCustomerAccountAsync(
        string phone, string fullName, string? email, string password, CancellationToken ct = default);
}

