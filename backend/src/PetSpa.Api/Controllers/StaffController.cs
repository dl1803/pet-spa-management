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
}
