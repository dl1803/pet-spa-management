using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Booking;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/spa/slots")]
public sealed class SpaSlotsController(BookingService bookingService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrReceptionist)]
    [EndpointSummary("Xem các mốc giờ spa còn chỗ trong ngày")]
    [EndpointDescription("Tham số: date (yyyy-MM-dd), petId, serviceIds (các mã dịch vụ ngăn cách bằng dấu phẩy). Trả thời lượng, số nhân viên cần, thời gian dọn dẹp và trạng thái từng mốc giờ: Available, Full hoặc NotAccepted (muộn hơn mốc bắt đầu muộn nhất của dịch vụ). Khách hàng chỉ xem cho thú cưng của mình; lễ tân xem cho thú cưng của cửa hàng. Dịch vụ không áp dụng cho loài hoặc nhóm kích cỡ của thú cưng trả 400 VALIDATION_ERROR.")]
    public async Task<IActionResult> GetSlots([FromQuery] SpaSlotsQuery query, CancellationToken ct)
    {
        var result = await bookingService.GetSpaSlotsAsync(
            User.ToCurrentUser(),
            query.Date!.Value,
            query.PetId!.Value,
            SpaSlotsQuery.ParseServiceIds(query.ServiceIds)!,
            ct);

        return Ok(SpaSlotsResponse.From(result));
    }
}

