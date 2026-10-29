namespace PetSpa.Domain.Exceptions;

// Lỗi nghiệp vụ mang mã lỗi chuẩn hóa. Domain và Application ném lỗi này,
// middleware ở tầng API đổi thành HTTP status và error envelope.
public sealed class BusinessException(string code, string? detail = null) : Exception(detail ?? code)
{
    public string Code { get; } = code;

    // null thì dùng thông báo mặc định của mã lỗi trong ErrorCatalog (tầng API).
    public string? Detail { get; } = detail;
}

