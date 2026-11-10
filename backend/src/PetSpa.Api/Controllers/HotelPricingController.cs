using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/hotel/pricing")]
public sealed class HotelPricingController(HotelCatalogService hotelCatalog) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrReceptionistOrManager)]
    [EndpointSummary("Xem giá lưu trú, giá thức ăn và phí phạt trả muộn")]
    [EndpointDescription("Khách hàng, lễ tân, quản lý. Giá lưu trú và giá thức ăn theo đêm cho từng loài và nhóm kích cỡ; lateFeePerBlock là phí phạt mỗi lần trả muộn, bằng 0 khi quản lý chưa thiết lập.")]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var snapshot = await hotelCatalog.GetPricingAsync(ct);
        return Ok(HotelPricingResponse.From(snapshot));
    }

    [HttpPut]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Thiết lập giá lưu trú, giá thức ăn và phí phạt trả muộn")]
    [EndpointDescription("Chỉ quản lý. Mỗi dòng pricing thêm mới hoặc cập nhật giá của một cặp loài và nhóm kích cỡ; dòng không gửi thì giữ nguyên. Cặp loài và nhóm kích cỡ không hợp lệ hoặc bị trùng trả 400 VALIDATION_ERROR. lateFeePerBlock chỉ chỉnh tại đây. Có hiệu lực cho các lịch hẹn lưu trú tạo sau đó.")]
    public async Task<IActionResult> Update([FromBody] HotelPricingRequest request, CancellationToken ct)
    {
        await hotelCatalog.SetLodgingPricesAsync(request.ToPriceInputs(), request.LateFeePerBlock!.Value, ct);
        return Ok();
    }
}

