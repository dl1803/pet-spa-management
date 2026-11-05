using PetSpa.Application.Common;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

// Hồ sơ của chính người gọi. StaffRole chỉ có khi Role = Staff; Phone chỉ có với khách hàng.
public sealed record MeProfile(
    Guid UserId, string UserName, UserRole Role, StaffRole? StaffRole,
    string? FullName, string? Phone, string? Email);

public sealed record CustomerSummary(Guid CustomerId, string FullName, string Phone, string? Email, bool IsBookingLocked);

// Port truy cập dữ liệu tài khoản và hồ sơ khách hàng/nhân viên (Backend-Conventions 3.3).
public interface IAccountRepository
{
    // Tạo AppUser (Role = Customer) và Customer trong một giao dịch.
    // Trùng số điện thoại -> DUPLICATE_CONTACT; mật khẩu không đạt -> VALIDATION_ERROR.
    Task<Guid> CreateCustomerAccountAsync(
        string phone, string fullName, string? email, string password, CancellationToken ct = default);

    Task<MeProfile?> GetMeAsync(Guid userId, CancellationToken ct = default);

    // Cập nhật Customer; nếu đổi số thì cập nhật cả AppUser.UserName trong cùng giao dịch (X-02).
    // phone = null: giữ nguyên số. email = null: xóa email.
    Task UpdateCustomerProfileAsync(
        Guid userId, string fullName, string? phone, string? email, CancellationToken ct = default);

    Task UpdateStaffFullNameAsync(Guid userId, string fullName, CancellationToken ct = default);

    // Customer.UserId = NULL, không tạo AppUser. Trùng số điện thoại -> DUPLICATE_CONTACT.
    Task<Guid> CreateWalkInAsync(string fullName, string phone, CancellationToken ct = default);

    // phone = null: lấy tất cả. Tìm theo số điện thoại chứa chuỗi tìm.
    Task<PagedResult<CustomerSummary>> SearchCustomersAsync(
        string? phone, int page, int pageSize, CancellationToken ct = default);
}
