using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Common;
using PetSpa.Application.Services.Pets;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/pets")]
public sealed class PetsController(PetService petService) : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrReceptionist)]
    [EndpointSummary("Tạo hồ sơ thú cưng")]
    [EndpointDescription("Hệ thống tự xác định nhóm kích cỡ theo bảng mốc SizeRule (BR-19), bỏ qua nhóm do client gửi. Lễ tân bắt buộc kèm customerId; khách hàng tạo cho chính mình (bỏ qua customerId). heightCm bắt buộc khi loài là chó.")]
    public async Task<IActionResult> Create([FromBody] PetRequest request, CancellationToken ct)
    {
        var pet = await petService.CreateAsync(User.ToCurrentUser(), ToInput(request), request.CustomerId, ct);
        return StatusCode(StatusCodes.Status201Created, new PetCreatedResponse(pet.PetId, pet.SizeGroup));
    }

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrReceptionist)]
    [EndpointSummary("Danh sách hồ sơ thú cưng đang hoạt động")]
    [EndpointDescription("Khách hàng: của mình. Lễ tân: theo customerId. Mặc định page = 1, pageSize = 20 (tối đa 100).")]
    public async Task<IActionResult> List([FromQuery] PetListQuery query, CancellationToken ct)
    {
        var result = await petService.ListAsync(User.ToCurrentUser(), query.CustomerId, query.Page, query.PageSize, ct);
        var items = result.Items.Select(PetResponse.From).ToList();
        return Ok(new PagedResult<PetResponse>(items, result.Page, result.PageSize, result.Total));
    }

    [HttpGet("{id}")]
    [Authorize]
    [EndpointSummary("Xem hồ sơ thú cưng trong phạm vi")]
    [EndpointDescription("Khách hàng: của mình. Lễ tân, quản lý: toàn cửa hàng. Nhân viên spa: thú cưng của lịch hẹn được phân công.")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var pet = await petService.GetAsync(User.ToCurrentUser(), id, ct);
        return Ok(PetResponse.From(pet));
    }

    private static PetInput ToInput(PetRequest request) => new(
        request.Name!,
        request.Species!.Value,
        request.Breed!,
        request.Temperament,
        request.WeightKg!.Value,
        request.HeightCm,
        request.CoatNote,
        request.Notes);
}
