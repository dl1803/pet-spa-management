using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/cages")]
public sealed class CagesController(HotelCatalogService hotelCatalog) : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Thêm chuồng")]
    [EndpointDescription("Chỉ quản lý. Chuồng mới ở trạng thái đang sử dụng. Mã chuồng trùng thì trả 409 DUPLICATE_CAGE_CODE.")]
    public async Task<IActionResult> Create([FromBody] CageCreateRequest request, CancellationToken ct)
    {
        var cageId = await hotelCatalog.CreateCageAsync(request.ToInput(), ct);
        return StatusCode(StatusCodes.Status201Created, new CageCreatedResponse(cageId));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Cập nhật chuồng")]
    [EndpointDescription("Chỉ quản lý. Chỉ các trường được gửi mới được đổi. Mã chuồng trùng chuồng khác trả 409 DUPLICATE_CAGE_CODE; không tìm thấy chuồng trả 404 NOT_FOUND.")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CageUpdateRequest request, CancellationToken ct)
    {
        await hotelCatalog.UpdateCageAsync(id, request.ToInput(), ct);
        return Ok();
    }

    [HttpPatch("{id}/status")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Ngừng hoặc mở lại sử dụng chuồng")]
    [EndpointDescription("Chỉ quản lý. isActive = false là ngừng sử dụng chuồng, true là mở lại. Không tìm thấy chuồng trả 404 NOT_FOUND.")]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] ActiveToggleRequest request, CancellationToken ct)
    {
        await hotelCatalog.SetCageActiveAsync(id, request.IsActive!.Value, ct);
        return NoContent();
    }
}

