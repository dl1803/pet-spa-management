using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.StaffManagement;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/staff")]
[Authorize(Policy = AuthorizationPolicies.Manager)]
public sealed class StaffController(StaffService staffService) : ControllerBase
{
    [HttpPost]
    [EndpointSummary("Quản lý tạo tài khoản, hồ sơ nhân viên")]
    [EndpointDescription("Role luôn là Staff; staffRole (Receptionist hoặc SpaStaff) do quản lý chọn. userName là số điện thoại, được chuẩn hóa trước khi lưu. Trùng số điện thoại trả 409 DUPLICATE_CONTACT.")]
    public async Task<IActionResult> Create([FromBody] CreateStaffRequest request, CancellationToken ct)
    {
        var staffId = await staffService.CreateAsync(
            request.UserName, request.FullName, request.StaffRole!.Value, request.Password, ct);
        return StatusCode(StatusCodes.Status201Created, new CreateStaffResponse(staffId));
    }

    [HttpGet]
    [EndpointSummary("Quản lý xem danh sách nhân viên")]
    [EndpointDescription("Gồm cả nhân viên đã bị vô hiệu hóa (isActive = false). Mặc định page = 1, pageSize = 20 (tối đa 100).")]
    public async Task<IActionResult> List([FromQuery] ListStaffQuery query, CancellationToken ct)
    {
        var result = await staffService.ListAsync(query.Page, query.PageSize, ct);
        return Ok(result);
    }

    [HttpPut("{id}")]
    [EndpointSummary("Quản lý cập nhật thông tin, vai trò nhân viên")]
    [EndpointDescription("Cập nhật fullName và staffRole. Số điện thoại không đổi ở đây. Không tìm thấy nhân viên trả 404 NOT_FOUND.")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateStaffRequest request, CancellationToken ct)
    {
        await staffService.UpdateAsync(id, request.FullName, request.StaffRole!.Value, ct);
        return Ok();
    }

    [HttpPost("{id}/deactivate")]
    [EndpointSummary("Quản lý vô hiệu hóa tài khoản nhân viên")]
    [EndpointDescription("IsActive = false, thu hồi mọi refresh token, nhân viên mất quyền đăng nhập ngay. returnedToPending là số lịch spa đã chuyển về Chờ xác nhận (phần này hoàn thiện ở ID 64). Gọi lại trên nhân viên đã vô hiệu hóa vẫn trả 200.")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        var returnedToPending = await staffService.DeactivateAsync(id, ct);
        return Ok(new DeactivateStaffResponse(returnedToPending));
    }
}
