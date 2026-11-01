using PetSpa.Application.Common;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

// Một dòng trong danh sách nhân viên. UserName là số điện thoại; IsActive lấy từ AppUser.
public sealed record StaffSummary(Guid StaffId, string UserName, string FullName, StaffRole StaffRole, bool IsActive);

public interface IStaffRepository
{
    // Tạo AppUser (Role = Staff, IsActive = true) và Staff trong một giao dịch. Trả StaffId.
    // Trùng số điện thoại -> DUPLICATE_CONTACT; mật khẩu không đạt -> VALIDATION_ERROR.
    Task<Guid> CreateAsync(
        string phone, string fullName, StaffRole staffRole, string password, CancellationToken ct = default);

    // Gồm cả nhân viên đã vô hiệu hóa.
    Task<PagedResult<StaffSummary>> ListAsync(int page, int pageSize, CancellationToken ct = default);

    // Không có StaffId -> NOT_FOUND. Không đổi số điện thoại.
    Task UpdateAsync(Guid staffId, string fullName, StaffRole staffRole, CancellationToken ct = default);
}
