using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

// Port đọc StaffRole (Receptionist | SpaStaff) từ dữ liệu Staff.
// StaffRole không có trong token nên backend phải tra mỗi khi cần phân biệt Lễ tân / Nhân viên spa.
public interface IStaffRoleReader
{
    // Trả null nếu tài khoản không có hồ sơ Staff.
    Task<StaffRole?> GetStaffRoleAsync(Guid userId, CancellationToken ct = default);
}
