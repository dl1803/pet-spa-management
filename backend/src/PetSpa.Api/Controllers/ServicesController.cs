using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/services")]
public sealed class ServicesController(ServiceCatalogService catalog) : ControllerBase
{
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<ServiceResponse>>> List(
        [FromQuery] Species? species, [FromQuery] SizeGroup? sizeGroup, CancellationToken ct)
    {
        var services = await catalog.ListAsync(User.ToCurrentUser(), species, sizeGroup, ct);
        return Ok(services.Select(ServiceResponse.From).ToList());
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> Create(ServiceRequest request, CancellationToken ct)
    {
        var serviceId = await catalog.CreateAsync(request.ToInput(), ct);
        return StatusCode(StatusCodes.Status201Created, new ServiceCreatedResponse(serviceId));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> Update(Guid id, ServiceRequest request, CancellationToken ct)
    {
        await catalog.UpdateAsync(id, request.ToInput(), ct);
        return Ok();
    }

    [HttpPatch("{id}/status")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> SetStatus(Guid id, ActiveToggleRequest request, CancellationToken ct)
    {
        await catalog.SetActiveAsync(id, request.IsActive!.Value, ct);
        return NoContent();
    }
}
