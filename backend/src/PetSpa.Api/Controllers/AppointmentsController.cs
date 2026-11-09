using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/appointments")]
public sealed class AppointmentsController(BookingService bookingService) : ControllerBase
{
    [HttpPost("spa")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrReceptionist)]
    [EnableRateLimiting(RateLimitPolicies.Booking)]
    [EndpointSummary("Tạo lịch hẹn spa Chờ xác nhận")]
    [EndpointDescription("Khách hàng tự đặt cho thú cưng của mình; lễ tân đặt thay và bắt buộc kèm customerId. Không nhận nhân viên, tiền, nhóm kích cỡ, trạng thái. Khách hàng đang bị khóa tự đặt lịch nhận 403 BOOKING_LOCKED (lễ tân đặt thay không bị chặn). Mốc giờ đã kín nhận 409 SLOT_FULL. Dịch vụ không áp dụng cho thú cưng hoặc slotStart không đúng mốc giờ đặt lịch nhận 400 VALIDATION_ERROR. Giới hạn theo tài khoản, vượt giới hạn nhận 429 RATE_LIMITED.")]
    public async Task<IActionResult> CreateSpa([FromBody] SpaBookingRequest? request, CancellationToken ct)
    {
        if (request is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu yêu cầu không được để trống.");

        var result = await bookingService.CreateSpaAppointmentAsync(
            User.ToCurrentUser(),
            request.CustomerId,
            request.PetId!.Value,
            request.ServiceIds!,
            request.SlotStart!.Value,
            ct);

        return StatusCode(StatusCodes.Status201Created, SpaBookingResponse.From(result));
    }
}

