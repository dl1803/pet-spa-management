using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

// FR-STF-01. Không có role: Role luôn là Staff do backend đặt; trường thừa bị bỏ qua.
// StaffRole là enum nullable để phân biệt "không gửi" với giá trị mặc định (Receptionist).
public sealed record CreateStaffRequest(string UserName, string FullName, StaffRole? StaffRole, string Password);

public sealed record CreateStaffResponse(Guid StaffId);
