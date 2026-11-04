using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Auth;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(AccountService accountService, AuthService authService) : ControllerBase
{
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [EndpointSummary("Đăng ký tài khoản khách hàng")]
    [EndpointDescription("Role luôn là Customer; userName là số điện thoại, được chuẩn hóa trước khi lưu. Trùng thông tin liên hệ trả 409 DUPLICATE_CONTACT.")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var userId = await accountService.RegisterAsync(
            request.UserName, request.FullName, request.Password, request.Email, ct);
        return StatusCode(StatusCodes.Status201Created, new RegisterResponse(userId));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [EndpointSummary("Đăng nhập")]
    [EndpointDescription("userName là số điện thoại. Sai thông tin hoặc tài khoản bị vô hiệu hóa đều trả 401 UNAUTHENTICATED.")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var tokens = await authService.LoginAsync(request.UserName, request.Password, ct);
        return Ok(tokens);
    }
}

