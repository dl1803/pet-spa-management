using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
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

