using System.Text.Json.Serialization;

namespace PetSpa.Api.Dtos;

// Error envelope trả về cho Web: { status, code, title, detail } 
// Lỗi hệ thống 500 không có mã lỗi nghiệp vụ nên Code = null và trường code không được ghi ra JSON.
public sealed record ErrorResponse(
    int Status,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Code,
    string Title,
    string Detail);

