using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Common;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/appointments")]
public sealed class AppointmentPhotosController(AppointmentPhotoService photoService) : ControllerBase
{
    [HttpPost("{id}/photos")]
    [Authorize(Policy = AuthorizationPolicies.SpaStaff)]
    [RequestSizeLimit(PhotoRules.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = PhotoRules.MaxRequestBytes)]
    [EndpointSummary("Nhân viên spa tải lên ảnh trước hoặc sau chăm sóc cho lịch được phân công")]
    [EndpointDescription("Chỉ nhân viên spa được phân công cho lịch. Body multipart/form-data gồm kind (Before hoặc After) và file (ảnh JPEG, PNG hoặc WebP, tối đa 50 MB). Ảnh Before chỉ nhận khi lịch ở Đã tiếp nhận, ảnh After chỉ nhận khi lịch ở Đang thực hiện; sai trạng thái trả 409 INVALID_TRANSITION. Lịch không được phân công cho người gọi trả 403 FORBIDDEN; không tìm thấy lịch trả 404 NOT_FOUND. Thiếu kind hoặc file, tệp rỗng, quá 50 MB hoặc không phải ảnh được hỗ trợ trả 400 VALIDATION_ERROR. Trả 201 { photoId }.")]
    public async Task<IActionResult> Upload(Guid id, [FromForm] UploadPhotoRequest? request, CancellationToken ct)
    {
        if (request?.Kind is null || request.File is null)
            throw new BusinessException(ErrorCodes.ValidationError, "kind và file là bắt buộc.");

        await using var content = request.File.OpenReadStream();

        var photoId = await photoService.UploadAsync(User.ToCurrentUser(), id, request.Kind.Value, content, ct);

        return StatusCode(StatusCodes.Status201Created, new PhotoCreatedResponse(photoId));
    }

    [HttpGet("{id}/photos")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrSpaStaffOrManager)]
    [EndpointSummary("Xem ảnh trước và sau chăm sóc của một lịch hẹn")]
    [EndpointDescription("Khách hàng chỉ xem ảnh của lịch của mình, nhân viên spa chỉ xem ảnh của lịch được phân công cho mình, quản lý xem mọi lịch; lễ tân không có quyền. Trả mảng [{ photoId, kind, url, uploadedAt }] theo thứ tự thời điểm tải lên, không phân trang. url là đường dẫn tạm thời có hiệu lực 60 phút; khóa lưu trữ không bao giờ được trả. Ngoài phạm vi trả 403 FORBIDDEN; không tìm thấy lịch trả 404 NOT_FOUND.")]
    public async Task<IActionResult> List(Guid id, CancellationToken ct)
    {
        var photos = await photoService.ListAsync(User.ToCurrentUser(), id, ct);
        return Ok(photos.Select(PhotoResponse.From).ToList());
    }
}
