using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Common;
using PetSpa.Application.Services.Assignment;
using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/appointments")]
public sealed class AppointmentsController(
    BookingService bookingService,
    AppointmentQueryService appointmentQueryService = null!,
    AssignmentService assignmentService = null!,
    HotelBookingService hotelBookingService = null!,
    AppointmentChangeService appointmentChangeService = null!,
    HotelAssignmentService hotelAssignmentService = null!,
    AppointmentInterventionService appointmentInterventionService = null!,
    CheckInService checkInService = null!) : ControllerBase
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
    [EndpointDescription("Khách hàng tự đặt cho thú cưng của mình; lễ tân đặt thay và bắt buộc kèm customerId khớp chủ thú cưng. Không nhận chuồng, tiền, nhóm kích cỡ, trạng thái. Trả nights và estimatedAmount do hệ thống tính. Khách hàng đang bị khóa tự đặt lịch nhận 403 BOOKING_LOCKED (lễ tân đặt thay không bị chặn). Hết chuồng phù hợp trong khoảng đặt, kể cả khi nhiều người đặt đồng thời, nhận 409 NO_CAPACITY. Ngày trả không sau ngày nhận hoặc customerId không khớp nhận 400 VALIDATION_ERROR. Giới hạn theo tài khoản, vượt giới hạn nhận 429 RATE_LIMITED. Lịch lưu trú không kèm dịch vụ spa.")]
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
    [Authorize]
    [EndpointSummary("Xem danh sách lịch hẹn theo phạm vi vai trò")]
    [EndpointDescription("Lọc theo phạm vi vai trò ở backend. Khách hàng: chỉ lịch hẹn của mình, lọc tùy chọn theo type (Spa, Hotel), status và petId. Xem lịch sử sử dụng dịch vụ: status = Completed kèm petId; thú cưng không thuộc khách trả 403 FORBIDDEN, không tìm thấy trả 404. Quản lý, lễ tân: toàn cửa hàng, lọc tùy chọn theo type, status (status = Pending cho danh sách Chờ xác nhận) và petId, lịch tạo sớm nhất trước. Nhân viên spa: chỉ lịch spa đang được phân công cho mình, lọc tùy chọn theo type, status và petId, lịch tạo sớm nhất trước. Tài khoản nhân viên không có hồ sơ nhận 403 FORBIDDEN. Mặc định page = 1, pageSize = 20 (tối đa 100).")]
    public async Task<IActionResult> List([FromQuery] ListAppointmentsQuery query, CancellationToken ct)
    {
        var result = await appointmentQueryService.ListAsync(
            User.ToCurrentUser(), query.Type, query.Status, query.PetId, query.Page, query.PageSize, ct);

        var items = result.Items.Select(i => AppointmentResponse.From(i.Appointment, i.PetName)).ToList();
        return Ok(new PagedResult<AppointmentResponse>(items, result.Page, result.PageSize, result.Total));
    }

    [HttpGet("{id}/suggestions")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Quản lý xem đề xuất nhân viên spa hoặc chuồng cho lịch Chờ xác nhận")]
    [EndpointDescription("Chỉ quản lý. Lịch spa: nhân viên spa đang hoạt động, có ca làm phủ trọn khoảng giữ chỗ (gồm thời gian dọn dẹp), chưa có lịch trùng; xếp theo số lịch được phân công trong Suggest.LookbackDays ngày gần nhất tăng dần (không tính lịch đã hủy), bằng nhau xếp theo tên. suggested có staffRequired người đầu danh sách (ít hơn nếu không đủ nhân viên), alternatives là các nhân viên còn lại đạt điều kiện. Lịch lưu trú: cage là chuồng đang sử dụng, cùng loài và nhóm kích cỡ của lịch, không có lịch Đã xác nhận hoặc Đang lưu trú khác trùng đêm, lấy chuồng có mã nhỏ nhất; không còn chuồng phù hợp thì cage = null. Chỉ đề xuất, không ghi phân công hay gán chuồng. Không tìm thấy lịch trả 404 NOT_FOUND; lịch không ở Chờ xác nhận trả 409 INVALID_TRANSITION.")]
    public async Task<IActionResult> GetSuggestions(Guid id, CancellationToken ct)
    {
        var user = User.ToCurrentUser();

        if (appointmentQueryService is not null)
        {
            var type = await appointmentQueryService.GetTypeAsync(id, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (type == AppointmentType.Hotel)
            {
                var hotel = await hotelAssignmentService.GetCageSuggestionAsync(user, id, ct);
                if (hotel is null) throw new BusinessException(ErrorCodes.NotFound);
                return Ok(HotelSuggestionsResponse.From(hotel));
            }

            var spaResult = await assignmentService.GetSpaSuggestionsAsync(user, id, ct);
            return Ok(SpaSuggestionsResponse.From(spaResult));
        }

        var hotelFallback = await hotelAssignmentService.GetCageSuggestionAsync(user, id, ct);
        if (hotelFallback is not null) return Ok(HotelSuggestionsResponse.From(hotelFallback));

        var result = await assignmentService.GetSpaSuggestionsAsync(user, id, ct);
        return Ok(SpaSuggestionsResponse.From(result));
    }

    [HttpPost("{id}/confirm")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Quản lý xác nhận lịch hẹn kèm nhân viên hoặc chuồng")]
    [EndpointDescription("Chỉ quản lý. Lịch spa: staffIds đủ số nhân viên cần của lịch (staffRequired), tùy chọn confirmOutOfShift = true để xác nhận nhân viên chọn tay nằm ngoài ca làm. Chuyển lịch Chờ xác nhận sang Đã xác nhận; số tiền được tính lại phía máy chủ trong cùng giao dịch, không nhận từ client. Không tìm thấy lịch spa trả 404 NOT_FOUND; lịch không ở Chờ xác nhận trả 409 INVALID_TRANSITION; sai số nhân viên trả 409 STAFF_COUNT_MISMATCH; nhân viên trùng giờ trả 409 STAFF_CONFLICT; nhân viên ngoài ca mà chưa xác nhận lại trả 409 STAFF_OUT_OF_SHIFT; nhân viên không phải nhân viên spa đang hoạt động hoặc thiếu giá dịch vụ trả 400 VALIDATION_ERROR. Lịch lưu trú: cageId bắt buộc; chuyển lịch Chờ xác nhận sang Đã xác nhận và gán chuồng đang sử dụng, cùng loài và nhóm kích cỡ của lịch, không trùng đêm với lịch lưu trú Đã xác nhận hoặc Đang lưu trú khác. Không tìm thấy lịch hoặc chuồng trả 404 NOT_FOUND; chuồng không phù hợp hoặc trùng đêm trả 409 CAGE_CONFLICT; lịch không ở Chờ xác nhận trả 409 INVALID_TRANSITION; thiếu cageId trả 400 VALIDATION_ERROR.")]
    public async Task<IActionResult> Confirm(Guid id, [FromBody] ConfirmAppointmentRequest? request, CancellationToken ct)
    {
        if (request is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu yêu cầu không được để trống.");

        if (appointmentQueryService is not null)
        {
            var type = await appointmentQueryService.GetTypeAsync(id, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (type == AppointmentType.Hotel)
            {
                if (!request.CageId.HasValue)
                    throw new BusinessException(ErrorCodes.ValidationError, "Lịch lưu trú yêu cầu cageId.");

                var status = await hotelAssignmentService.ConfirmHotelAsync(
                    User.ToCurrentUser(), id, request.CageId.Value, ct);

                return Ok(new AppointmentStatusResponse(status));
            }

            if (request.StaffIds is null || request.StaffIds.Count == 0)
                throw new BusinessException(ErrorCodes.ValidationError, "Lịch spa yêu cầu staffIds.");
        }

        var result = await assignmentService.ConfirmSpaAsync(
            User.ToCurrentUser(), id, request.StaffIds, request.ConfirmOutOfShift, ct);

        return Ok(new AppointmentStatusResponse(result.Status));
    }

    [HttpPost("{id}/reject")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Quản lý từ chối lịch hẹn")]
    [EndpointDescription("Chỉ quản lý. Chuyển lịch Chờ xác nhận sang Đã từ chối; giải phóng toàn bộ nhân viên đang giữ chỗ. Không tìm thấy lịch trả 404 NOT_FOUND; lịch không ở Chờ xác nhận trả 409 INVALID_TRANSITION. Lịch lưu trú: chuyển lịch Chờ xác nhận sang Đã hủy với lý do StoreUnable; lịch Chờ xác nhận chưa gán chuồng nên không có chuồng cần giải phóng.")]
    public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
    {
        if (appointmentQueryService is not null)
        {
            var type = await appointmentQueryService.GetTypeAsync(id, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (type == AppointmentType.Hotel)
            {
                await hotelAssignmentService.RejectHotelAsync(User.ToCurrentUser(), id, ct);
                return Ok(new RejectAppointmentResponse(AppointmentStatus.Cancelled, CancelReason.StoreUnable));
            }
        }

        await assignmentService.RejectSpaAsync(User.ToCurrentUser(), id, ct);
        return Ok(new RejectAppointmentResponse(AppointmentStatus.Cancelled, CancelReason.StoreUnable));
    }

    [HttpPost("{id}/check-in")]
    [Authorize(Policy = AuthorizationPolicies.ReceptionistOrManager)]
    [EndpointSummary("Lễ tân hoặc quản lý tiếp nhận thú cưng lịch spa và đối chiếu cân nặng")]
    [EndpointDescription("Chỉ lễ tân và quản lý. Lịch spa: body { actualWeightKg }; lịch Đã xác nhận chuyển sang Đã tiếp nhận khi chưa quá Booking.HoldMinutes sau giờ hẹn, đồng thời ghi nhận và đối chiếu cân nặng thực tế (BR-23). Trả { status, weightCheck } với weightCheck.result là OK, PRICE_DECREASED hoặc NEEDS_CONFIRMATION; newSizeGroup, oldAmount, newAmount có khi kết quả khác OK. PRICE_DECREASED hạ nhóm kích cỡ của lịch, giảm chi phí và cập nhật hồ sơ thú cưng; OK chỉ ghi nhận cân nặng, giữ nguyên chi phí và cập nhật hồ sơ thú cưng; NEEDS_CONFIRMATION tính lại chi phí, tạo yêu cầu xác nhận chi phí mới (expiresAt là hạn phản hồi), giữ nguyên nhóm kích cỡ, hồ sơ thú cưng và trạng thái lịch. Thiếu hoặc sai cân nặng trả 400 VALIDATION_ERROR. Lịch không ở Đã xác nhận hoặc ngoài khoảng thời gian cho phép tiếp nhận trả 409 INVALID_TRANSITION; không tìm thấy lịch spa trả 404 NOT_FOUND. Tiếp nhận lưu trú thuộc ID88.")]
    public async Task<IActionResult> CheckIn(
        Guid id, [FromBody] ActualWeightRequest? request, CancellationToken ct)
    {
        if (appointmentQueryService is not null)
        {
            var type = await appointmentQueryService.GetTypeAsync(id, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (type == AppointmentType.Hotel)
            {
                // Tiếp nhận lịch lưu trú thuộc ID88 (D28–D29). Hiện tại lịch lưu trú chưa hỗ trợ check-in.
                throw new BusinessException(ErrorCodes.NotFound);
            }
        }

        if (request?.ActualWeightKg is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Cân nặng thực tế là bắt buộc.");

        var result = await checkInService.CheckInSpaAsync(
            User.ToCurrentUser(), id, request.ActualWeightKg.Value, ct);

        return Ok(CheckInResponse.From(result));
    }

    [HttpPost("{id}/weight-check")]
    [Authorize(Policy = AuthorizationPolicies.ReceptionistOrManager)]
    [EndpointSummary("Lễ tân hoặc quản lý ghi nhận và đối chiếu cân nặng lịch lưu trú")]
    [EndpointDescription("Chỉ lễ tân và quản lý. Body { actualWeightKg }. Chỉ áp dụng cho lịch lưu trú Đã xác nhận; lịch giữ nguyên trạng thái. Trả { weightCheck } với weightCheck.result là OK, PRICE_DECREASED hoặc NEEDS_CONFIRMATION (BR-23); newSizeGroup, oldAmount, newAmount có khi kết quả khác OK. PRICE_DECREASED hạ nhóm kích cỡ của lịch, giảm chi phí và cập nhật hồ sơ thú cưng; OK chỉ ghi nhận cân nặng, giữ nguyên chi phí và cập nhật hồ sơ thú cưng; NEEDS_CONFIRMATION tính lại chi phí, tạo yêu cầu xác nhận chi phí mới (expiresAt là hạn phản hồi), giữ nguyên nhóm kích cỡ, hồ sơ thú cưng và trạng thái lịch. Cân nặng không hợp lệ trả 400 VALIDATION_ERROR; lịch lưu trú không ở Đã xác nhận trả 409 INVALID_TRANSITION; lịch lưu trú đang chờ xác nhận chi phí mới trả 409 COST_CONFIRMATION_PENDING; không tìm thấy lịch lưu trú trả 404 NOT_FOUND.")]
    public async Task<IActionResult> WeightCheck(
        Guid id, [FromBody] ActualWeightRequest? request, CancellationToken ct)
    {
        if (request?.ActualWeightKg is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Cân nặng thực tế là bắt buộc.");

        var outcome = await checkInService.CheckHotelWeightAsync(
            User.ToCurrentUser(), id, request.ActualWeightKg.Value, ct);

        return Ok(WeightCheckResponse.From(outcome));
    }

    [HttpGet("{id}")]
    [Authorize]
    [EndpointSummary("Xem chi tiết lịch hẹn theo phạm vi vai trò")]
    [EndpointDescription("Khách hàng: chỉ lịch của mình, lịch của khách khác trả 403 FORBIDDEN và không trả thông tin. Nhân viên spa: chỉ lịch spa được phân công cho mình, lịch khác trả 403 FORBIDDEN và không trả thông tin. Lễ tân, quản lý: toàn cửa hàng. Không tìm thấy trả 404. Lịch spa kèm danh sách dịch vụ và nhân viên được phân công (rỗng khi chưa xác nhận); lịch lưu trú trả hai danh sách rỗng.")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var detail = await appointmentQueryService.GetAsync(User.ToCurrentUser(), id, ct);
        return Ok(AppointmentDetailResponse.From(detail));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrManager)]
    [EndpointSummary("Khách hàng đổi lịch hẹn của mình trong hạn tự đổi; quản lý đổi lịch hẹn khi can thiệp")]
    [EndpointDescription("Khách hàng: chỉ lịch hẹn của mình. Lịch spa gửi petId, slotStart, serviceIds; lịch lưu trú gửi petId, plannedCheckIn, plannedCheckOut; trường của loại lịch khác không được dùng; staffIds, cageId, confirmOutOfShift bị bỏ qua. Đổi thành công trả status = Pending: lịch Đã xác nhận quay về Chờ xác nhận, phân công nhân viên hoặc chuồng bị bỏ để quản lý duyệt lại. Quá hạn tự đổi nhận 409 CHANGE_WINDOW_CLOSED; mốc giờ đã kín nhận 409 SLOT_FULL; hết chuồng nhận 409 NO_CAPACITY; lịch không còn ở Chờ xác nhận hoặc Đã xác nhận nhận 409 INVALID_TRANSITION; thiếu trường bắt buộc của loại lịch hoặc slotStart không đúng mốc giờ đặt lịch nhận 400 VALIDATION_ERROR; lịch hoặc thú cưng của khách khác nhận 403 FORBIDDEN; không tìm thấy nhận 404 NOT_FOUND. Quản lý: đổi lịch Chờ xác nhận hoặc Đã xác nhận của bất kỳ khách nào, không bị giới hạn hạn tự đổi, trạng thái được giữ nguyên; thú cưng mới phải thuộc khách của lịch. Lịch spa Đã xác nhận có thể gửi staffIds (đủ số nhân viên cần) và confirmOutOfShift, nếu không gửi thì giữ nhân viên hiện tại; lịch lưu trú Đã xác nhận có thể gửi cageId, nếu không gửi thì giữ chuồng hiện tại. Nhân viên trùng giờ nhận 409 STAFF_CONFLICT; nhân viên ngoài ca mà chưa xác nhận lại nhận 409 STAFF_OUT_OF_SHIFT; sai số nhân viên nhận 409 STAFF_COUNT_MISMATCH; chuồng không phù hợp hoặc trùng đêm nhận 409 CAGE_CONFLICT; gửi staffIds hoặc cageId cho lịch Chờ xác nhận nhận 400 VALIDATION_ERROR.")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAppointmentRequest? request, CancellationToken ct)
    {
        if (request is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu yêu cầu không được để trống.");

        var user = User.ToCurrentUser();

        if (user.Role == UserRole.Manager)
        {
            var managerChange = new ManagerAppointmentChange(
                request.PetId!.Value,
                request.SlotStart,
                request.ServiceIds,
                request.PlannedCheckIn,
                request.PlannedCheckOut,
                request.StaffIds,
                request.CageId,
                request.ConfirmOutOfShift);

            var managerStatus = await appointmentInterventionService.RescheduleAsync(user, id, managerChange, ct);

            return Ok(new AppointmentStatusResponse(managerStatus));
        }

        var change = new AppointmentChange(
            request.PetId!.Value,
            request.SlotStart,
            request.ServiceIds,
            request.PlannedCheckIn,
            request.PlannedCheckOut);

        var status = await appointmentChangeService.ChangeAsync(user, id, change, ct);

        return Ok(new AppointmentStatusResponse(status));
    }

    [HttpPost("{id}/cancel")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrManager)]
    [EndpointSummary("Khách hàng hủy lịch hẹn của mình trong hạn tự hủy; quản lý hủy lịch hẹn khi can thiệp")]
    [EndpointDescription("Khách hàng: chỉ khách hàng sở hữu lịch hẹn; không gửi lý do, lý do hủy do hệ thống đặt là CustomerCancelled. Hủy thành công trả status = Cancelled: lịch spa giải phóng nhân viên đã phân công, lịch lưu trú giải phóng chuồng. Quá hạn tự hủy nhận 409 CHANGE_WINDOW_CLOSED (liên hệ hotline); lịch không còn ở Chờ xác nhận hoặc Đã xác nhận nhận 409 INVALID_TRANSITION; lịch của khách khác nhận 403 FORBIDDEN; không tìm thấy nhận 404 NOT_FOUND. Quản lý: bắt buộc gửi reason là StoreUnable hoặc CustomerBeyondDeadline, hủy được lịch ở mọi trạng thái trước Hoàn tất, không bị giới hạn hạn tự hủy; thiếu hoặc sai reason nhận 400 VALIDATION_ERROR; lịch Hoàn tất hoặc đã hủy nhận 409 INVALID_TRANSITION; không tìm thấy nhận 404 NOT_FOUND. Hủy thành công trả status = Cancelled, lịch spa giải phóng nhân viên, lịch lưu trú giải phóng chuồng.")]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelAppointmentRequest? request, CancellationToken ct)
    {
        var user = User.ToCurrentUser();

        if (user.Role == UserRole.Manager)
        {
            var managerStatus = await appointmentInterventionService.CancelAsync(user, id, request?.Reason, ct);

            return Ok(new AppointmentStatusResponse(managerStatus));
        }

        var status = await appointmentChangeService.CancelAsync(user, id, ct);

        return Ok(new AppointmentStatusResponse(status));
    }
}
