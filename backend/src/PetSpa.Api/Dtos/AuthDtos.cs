namespace PetSpa.Api.Dtos;

// FR-ACC-01. Không có role: Role luôn là Customer do backend đặt; trường thừa bị bỏ qua.
public sealed record RegisterRequest(string UserName, string FullName, string Password, string? Email);

public sealed record RegisterResponse(Guid UserId);

// FR-ACC-02. userName là số điện thoại.
public sealed record LoginRequest(string UserName, string Password);

