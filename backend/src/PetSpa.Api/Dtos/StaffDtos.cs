using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

// FR-STF-01. Không có role: Role luôn là Staff do backend đặt; trường thừa bị bỏ qua.
// StaffRole là enum nullable để phân biệt "không gửi" với giá trị mặc định (Receptionist).
public sealed record CreateStaffRequest(string UserName, string FullName, StaffRole? StaffRole, string Password);

public sealed record CreateStaffResponse(Guid StaffId);

// FR-STF-02. Không có userName: số điện thoại không đổi ở endpoint này (openapi.yaml, StaffUpdateRequest).
public sealed record UpdateStaffRequest(string FullName, StaffRole? StaffRole);

// GET /staff?page=&pageSize=
public sealed class ListStaffQuery
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
