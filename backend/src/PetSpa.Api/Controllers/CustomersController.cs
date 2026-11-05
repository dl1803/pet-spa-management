using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Auth;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/customers")]
public sealed class CustomersController(AccountService accountService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.Receptionist)]
    [EndpointSummary("Lễ tân tìm khách hàng")]
    [EndpointDescription("search là số điện thoại (khớp một phần). Mặc định page = 1, pageSize = 20 (tối đa 100). Phần quản lý xem khách bị khóa làm ở ID 99.")]
    public async Task<IActionResult> Search([FromQuery] ListCustomersQuery query, CancellationToken ct)
    {
        var result = await accountService.SearchCustomersAsync(query.Search, query.Page, query.PageSize, ct);
        return Ok(result);
    }

    [HttpPost("walk-in")]
    [Authorize(Policy = AuthorizationPolicies.Receptionist)]
    [EndpointSummary("Lễ tân ghi nhận khách vãng lai")]
    [EndpointDescription("Tạo khách hàng không có tài khoản đăng nhập. Trùng thông tin liên hệ trả 409 DUPLICATE_CONTACT, lễ tân chọn khách hiện có.")]
    public async Task<IActionResult> CreateWalkIn([FromBody] WalkInRequest request, CancellationToken ct)
    {
        var customerId = await accountService.CreateWalkInAsync(request.FullName, request.Phone, ct);
        return StatusCode(StatusCodes.Status201Created, new WalkInResponse(customerId));
    }
}
