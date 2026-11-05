using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

// GET /me. Role và StaffRole là enum, được JsonStringEnumConverter (Program.cs) trả dạng chuỗi.
public sealed record MeResponse(
    Guid UserId, string UserName, UserRole Role, StaffRole? StaffRole,
    string? FullName, string? Phone, string? Email);

// PUT /me. Không có id, role: tài khoản luôn lấy từ token (BR-16).
public sealed record UpdateMeRequest(string? FullName, string? Phone, string? Email);
