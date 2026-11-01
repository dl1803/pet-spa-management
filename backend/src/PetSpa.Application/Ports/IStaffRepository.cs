using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public interface IStaffRepository
{
    // Tạo AppUser (Role = Staff, IsActive = true) và Staff trong một giao dịch. Trả StaffId.
    // Trùng số điện thoại -> DUPLICATE_CONTACT; mật khẩu không đạt -> VALIDATION_ERROR.
    Task<Guid> CreateAsync(
        string phone, string fullName, StaffRole staffRole, string password, CancellationToken ct = default);
}
