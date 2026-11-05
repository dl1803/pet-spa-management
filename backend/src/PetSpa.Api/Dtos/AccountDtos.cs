using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

// GET /me. Role và StaffRole là enum, được JsonStringEnumConverter (Program.cs) trả dạng chuỗi.
public sealed record MeResponse(
    Guid UserId, string UserName, UserRole Role, StaffRole? StaffRole,
    string? FullName, string? Phone, string? Email);

// PUT /me. Không có id, role: tài khoản luôn lấy từ token (BR-16).
public sealed record UpdateMeRequest(string? FullName, string? Phone, string? Email);

// FR-ACC-04. Không có email (SA 5.1.3: { fullName, phone }).
public sealed record WalkInRequest(string FullName, string Phone);

public sealed record WalkInResponse(Guid CustomerId);

// GET /customers?search=&page=&pageSize=
public sealed class ListCustomersQuery
{
    public string? Search { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
