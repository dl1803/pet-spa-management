using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Notifications;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/notifications")]
[Authorize(Policy = AuthorizationPolicies.CustomerOrSpaStaff)]
public sealed class NotificationsController(NotificationService notificationService) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Xem thông báo của chính mình")]
    [EndpointDescription("Chỉ khách hàng và nhân viên spa; chỉ thấy thông báo gửi cho mình, mới nhất trước. Mặc định page = 1, pageSize = 20 (tối đa 100). unread là tổng số thông báo chưa đọc của mình.")]
    public async Task<IActionResult> List([FromQuery] ListNotificationsQuery query, CancellationToken ct)
    {
        var result = await notificationService.ListAsync(User.ToCurrentUser(), query.Page, query.PageSize, ct);
        var items = result.Notifications.Items.Select(NotificationResponse.From).ToList();
        return Ok(new NotificationPageResponse(
            items, result.Notifications.Page, result.Notifications.PageSize, result.Notifications.Total, result.Unread));
    }

    [HttpPost("{id}/read")]
    [EndpointSummary("Đánh dấu thông báo đã đọc")]
    [EndpointDescription("Thông báo của người khác trả 403 FORBIDDEN, không tìm thấy trả 404. Thông báo đã đọc rồi vẫn trả 204.")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        await notificationService.MarkReadAsync(User.ToCurrentUser(), id, ct);
        return NoContent();
    }
}
