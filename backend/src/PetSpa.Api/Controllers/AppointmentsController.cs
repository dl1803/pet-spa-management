using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Common;
using PetSpa.Application.Services.Assignment;
using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/appointments")]
public sealed class AppointmentsController(
    BookingService bookingService,
    AppointmentQueryService appointmentQueryService = null!,
    AssignmentService assignmentService = null!,
    HotelBookingService hotelBookingService = null!) : ControllerBase
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

    [HttpPost("hotel")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrReceptionist)]
    [EnableRateLimiting(RateLimitPolicies.Booking)]
    [EndpointSummary("Tạo lịch hẹn lưu trú Chờ xác nhận")]
    [EndpointDescription("Khách hàng tự đặt cho thú cưng của mình; lễ tân đặt thay và bắt buộc kèm customerId khớp chủ thú cưng. Không nhận chuồng, tiền, nhóm kích cỡ, trạng thái. Trả nights và estimatedAmount do hệ thống tính. Hết chuồng phù hợp trong khoảng đặt nhận 409 NO_CAPACITY. Ngày trả không sau ngày nhận hoặc customerId không khớp nhận 400 VALIDATION_ERROR. Lịch lưu trú không kèm dịch vụ spa.")]
    public async Task<IActionResult> CreateHotel([FromBody] HotelBookingRequest? request, CancellationToken ct)
    {
        if (request is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu yêu cầu không được để trống.");

        var result = await hotelBookingService.CreateHotelAppointmentAsync(
            User.ToCurrentUser(),
            request.CustomerId,
            request.PetId!.Value,
            request.PlannedCheckIn!.Value,
            request.PlannedCheckOut!.Value,
            ct);

        return StatusCode(StatusCodes.Status201Created, HotelBookingResponse.From(result));
    }

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrManager)]
    [EndpointSummary("Khách hàng xem lịch hẹn của mình; quản lý xem lịch hẹn toàn cửa hàng")]
    [EndpointDescription("Khách hàng: chỉ lịch hẹn của mình, lọc tùy chọn theo type (Spa, Hotel), status và petId. Xem lịch sử sử dụng dịch vụ: status = Completed kèm petId; thú cưng không thuộc khách trả 403 FORBIDDEN, không tìm thấy trả 404. Quản lý: toàn cửa hàng, lọc tùy chọn theo type, status (status = Pending cho danh sách Chờ xác nhận) và petId, lịch tạo sớm nhất trước. Lễ tân, nhân viên spa nhận 403 FORBIDDEN cho tới khi có phạm vi riêng. Mặc định page = 1, pageSize = 20 (tối đa 100).")]
    public async Task<IActionResult> List([FromQuery] ListAppointmentsQuery query, CancellationToken ct)
    {
        var result = await appointmentQueryService.ListAsync(
            User.ToCurrentUser(), query.Type, query.Status, query.PetId, query.Page, query.PageSize, ct);

        var items = result.Items.Select(i => AppointmentResponse.From(i.Appointment, i.PetName)).ToList();
        return Ok(new PagedResult<AppointmentResponse>(items, result.Page, result.PageSize, result.Total));
    }

    [HttpGet("{id}/suggestions")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Quản lý xem đề xuất nhân viên spa cho lịch Chờ xác nhận")]
    [EndpointDescription("Chỉ quản lý. Nhân viên spa đang hoạt động, có ca làm phủ trọn khoảng giữ chỗ (gồm thời gian dọn dẹp), chưa có lịch trùng; xếp theo số lịch được phân công trong Suggest.LookbackDays ngày gần nhất tăng dần (không tính lịch đã hủy), bằng nhau xếp theo tên. suggested có staffRequired người đầu danh sách (ít hơn nếu không đủ nhân viên), alternatives là các nhân viên còn lại đạt điều kiện. Chỉ đề xuất, không ghi phân công. Không tìm thấy lịch spa trả 404 NOT_FOUND; lịch không ở Chờ xác nhận trả 409 INVALID_TRANSITION.")]
    public async Task<IActionResult> GetSuggestions(Guid id, CancellationToken ct)
    {
        var result = await assignmentService.GetSpaSuggestionsAsync(User.ToCurrentUser(), id, ct);
        return Ok(SpaSuggestionsResponse.From(result));
    }

    [HttpGet("{id}")]
    [Authorize(Policy = AuthorizationPolicies.Customer)]
    [EndpointSummary("Khách hàng xem chi tiết lịch hẹn của mình")]
    [EndpointDescription("Kiểm tra quyền sở hữu theo id: lịch của khách khác trả 403 FORBIDDEN và không trả thông tin; không tìm thấy trả 404. Lịch spa kèm danh sách dịch vụ và nhân viên được phân công (rỗng khi chưa xác nhận); lịch lưu trú trả hai danh sách rỗng.")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var detail = await appointmentQueryService.GetAsync(User.ToCurrentUser(), id, ct);
        return Ok(AppointmentDetailResponse.From(detail));
    }
}

