using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Common;
using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/appointments")]
public sealed class AppointmentsController(
    BookingService bookingService,
    AppointmentQueryService appointmentQueryService = null!) : ControllerBase
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

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.Customer)]
    [EndpointSummary("Khách hàng xem danh sách lịch hẹn của mình")]
    [EndpointDescription("Chỉ khách hàng; chỉ thấy lịch spa và lưu trú của chính mình, mới tạo trước. Lọc tùy chọn theo type (Spa, Hotel) và status. Mặc định page = 1, pageSize = 20 (tối đa 100).")]
    public async Task<IActionResult> List([FromQuery] ListAppointmentsQuery query, CancellationToken ct)
    {
        var result = await appointmentQueryService.ListAsync(
            User.ToCurrentUser(), query.Type, query.Status, query.Page, query.PageSize, ct);

        var items = result.Items.Select(i => AppointmentResponse.From(i.Appointment, i.PetName)).ToList();
        return Ok(new PagedResult<AppointmentResponse>(items, result.Page, result.PageSize, result.Total));
    }
}

