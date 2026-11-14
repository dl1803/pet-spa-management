using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Booking;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/hotel/availability")]
public sealed class HotelAvailabilityController(HotelBookingService hotelBookingService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrReceptionistOrManager)]
    [EndpointSummary("Xem còn chỗ lưu trú, số đêm và tiền lưu trú tạm tính")]
    [EndpointDescription("Tham số: from, to (ISO 8601, kèm múi giờ), petId. available = còn ít nhất một chuồng phù hợp loài và nhóm kích cỡ của thú cưng, trống trong toàn bộ các đêm. nights tính theo ngày trong múi giờ cửa hàng; estimatedAmount là tiền lưu trú tạm tính (VND) do hệ thống tính từ bảng giá, luôn có kể cả khi hết chỗ. Khách hàng chỉ xem cho thú cưng của mình; lễ tân, quản lý xem cho thú cưng của cửa hàng. Ngày trả không sau ngày nhận trả 400 VALIDATION_ERROR; không tìm thấy thú cưng trả 404 NOT_FOUND.")]
    public async Task<IActionResult> Get([FromQuery] HotelAvailabilityQuery query, CancellationToken ct)
    {
        var result = await hotelBookingService.GetAvailabilityAsync(
            User.ToCurrentUser(), query.PetId!.Value, query.From!.Value, query.To!.Value, ct);

        return Ok(HotelAvailabilityResponse.From(result));
    }
}

