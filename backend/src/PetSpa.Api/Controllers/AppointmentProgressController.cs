using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/appointments")]
public sealed class AppointmentProgressController(AppointmentProgressService progressService) : ControllerBase
{
    [HttpPost("{id}/start")]
    [Authorize(Policy = AuthorizationPolicies.SpaStaffOrManager)]
    [EndpointSummary("Nhân viên spa được phân công hoặc quản lý bắt đầu thực hiện lịch spa")]
    [EndpointDescription("Chỉ nhân viên spa được phân công cho lịch hoặc quản lý. Chuyển lịch Đã tiếp nhận sang Đang thực hiện khi thú cưng có ảnh trước chăm sóc hợp lệ: ảnh Before gần nhất của thú cưng, tải lên trong Photo.ValidityDays ngày tính đến thời điểm bắt đầu. Trả 200 { status }. Chưa có ảnh trước hợp lệ trả 409 PHOTO_REQUIRED; lịch không ở Đã tiếp nhận trả 409 INVALID_TRANSITION. Nhân viên spa không được phân công, lễ tân hoặc khách hàng trả 403 FORBIDDEN; không tìm thấy lịch spa trả 404 NOT_FOUND.")]
    public async Task<IActionResult> Start(Guid id, CancellationToken ct)
    {
        var status = await progressService.StartAsync(User.ToCurrentUser(), id, ct);
        return Ok(new AppointmentStatusResponse(status));
    }

    [HttpPatch("{id}/services/{serviceId}")]
    [Authorize(Policy = AuthorizationPolicies.SpaStaffOrManager)]
    [EndpointSummary("Nhân viên spa được phân công hoặc quản lý đánh dấu dịch vụ trong lịch spa đã xong")]
    [EndpointDescription("Chỉ nhân viên spa được phân công cho lịch hoặc quản lý. Body { isDone, note? }: isDone = true đánh dấu xong (ghi thời điểm xong), false bỏ đánh dấu; note bỏ trống thì giữ ghi chú hiện có, chuỗi rỗng thì xóa ghi chú, tối đa 1000 ký tự. Chỉ áp dụng khi lịch Đang thực hiện, ngược lại trả 409 INVALID_TRANSITION. Thiếu isDone hoặc ghi chú quá dài trả 400 VALIDATION_ERROR. Nhân viên spa không được phân công, lễ tân hoặc khách hàng trả 403 FORBIDDEN; không tìm thấy lịch spa hoặc dịch vụ trong lịch trả 404 NOT_FOUND. Trả 200 không có body.")]
    public async Task<IActionResult> UpdateService(
        Guid id, Guid serviceId, [FromBody] ServiceProgressRequest? request, CancellationToken ct)
    {
        if (request?.IsDone is null)
            throw new BusinessException(ErrorCodes.ValidationError, "isDone là bắt buộc.");

        await progressService.UpdateServiceAsync(
            User.ToCurrentUser(), id, serviceId, request.IsDone.Value, request.Note, ct);

        return Ok();
    }

    [HttpPost("{id}/complete")]
    [Authorize(Policy = AuthorizationPolicies.SpaStaffOrManager)]
    [EndpointSummary("Nhân viên spa được phân công hoặc quản lý hoàn tất lịch spa")]
    [EndpointDescription("Chỉ nhân viên spa được phân công cho lịch hoặc quản lý. Chuyển lịch Đang thực hiện sang Hoàn tất khi mọi dịch vụ của lịch đã xong, lịch có ít nhất một ảnh sau chăm sóc và không có yêu cầu xác nhận chi phí đang chờ. Đồng thời nhả giữ chỗ nhân viên và hình thành khoản thanh toán spa chưa thanh toán, số tiền do backend tính. Trả 200 { status }. Lịch không có dịch vụ hoặc còn dịch vụ chưa xong trả 409 SERVICES_INCOMPLETE; chưa có ảnh sau chăm sóc trả 409 PHOTO_REQUIRED; đang chờ xác nhận chi phí trả 409 COST_CONFIRMATION_PENDING; lịch không ở Đang thực hiện trả 409 INVALID_TRANSITION. Nhân viên spa không được phân công, lễ tân hoặc khách hàng trả 403 FORBIDDEN; không tìm thấy lịch spa trả 404 NOT_FOUND.")]
    public async Task<IActionResult> Complete(Guid id, CancellationToken ct)
    {
        var status = await progressService.CompleteAsync(User.ToCurrentUser(), id, ct);
        return Ok(new AppointmentStatusResponse(status));
    }
}
