using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Auth;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/me")]
[Authorize]
public sealed class MeController(AccountService accountService) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Xem tài khoản của chính mình")]
    [EndpointDescription("Tài khoản lấy từ token, không nhận id từ client. staffRole chỉ có khi role là Staff; phone chỉ có với khách hàng.")]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var me = await accountService.GetMeAsync(User.ToCurrentUser(), ct);
        return Ok(new MeResponse(
            me.UserId, me.UserName, me.Role, me.StaffRole, me.FullName, me.Phone, me.Email));
    }

    [HttpPut]
    [EndpointSummary("Cập nhật thông tin cá nhân của chính mình")]
    [EndpointDescription("Khách hàng: fullName bắt buộc, phone/email tùy chọn (đổi phone cập nhật cả userName, trùng trả 409). Nhân viên: chỉ fullName. Quản lý: không có gì để cập nhật.")]
    public async Task<IActionResult> Update([FromBody] UpdateMeRequest request, CancellationToken ct)
    {
        await accountService.UpdateMeAsync(
            User.ToCurrentUser(), request.FullName, request.Phone, request.Email, ct);
        return Ok();
    }
}
