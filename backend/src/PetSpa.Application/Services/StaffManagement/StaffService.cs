using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services.StaffManagement;

// Nhóm Staff (Backend-Conventions 3.2, UC-26): tạo, cập nhật, vô hiệu hóa tài khoản nhân viên.
// Chỉ Quản lý gọi được (policy Manager ở StaffController) và Quản lý có toàn quyền (BR-16),
// nên service không nhận CurrentUser.
public sealed class StaffService(IStaffRepository staffs)
{
    // FR-STF-01: Role = Staff do adapter đặt; vai trò lễ tân/nhân viên spa do quản lý chọn.
    public Task<Guid> CreateAsync(
        string userName, string fullName, StaffRole staffRole, string password, CancellationToken ct = default) =>
        staffs.CreateAsync(PhoneNumber.Normalize(userName), fullName.Trim(), staffRole, password, ct);

    // FR-STF-02: danh sách có phân trang (page, pageSize đã được validator kiểm tra ở tầng API).
    public Task<PagedResult<StaffSummary>> ListAsync(int page, int pageSize, CancellationToken ct = default) =>
        staffs.ListAsync(page, pageSize, ct);

    // FR-STF-02: cập nhật họ tên và vai trò. Role của tài khoản vẫn là Staff, không đổi.
    public Task UpdateAsync(Guid staffId, string fullName, StaffRole staffRole, CancellationToken ct = default) =>
        staffs.UpdateAsync(staffId, fullName.Trim(), staffRole, ct);
}
