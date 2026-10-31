using PetSpa.Domain.Enums;

namespace PetSpa.Application.Security;

// Người đang gọi API, lấy từ access token đã xác thực.
public sealed record CurrentUser(Guid UserId, UserRole Role);
