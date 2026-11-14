using System.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Payments;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/payments")]
public sealed class PaymentsController(PaymentService paymentService) : ControllerBase
{
    [HttpPost("{id}/online")]
    [Authorize(Policy = AuthorizationPolicies.Customer)]
    [EndpointSummary("Khởi tạo thanh toán trực tuyến")]
    [EndpointDescription("Chỉ khách hàng, chỉ khoản thanh toán của lịch spa Hoàn tất, chưa thanh toán và thuộc về mình. Số tiền do hệ thống xác định, không nhận từ client. Tạo giao dịch với txnRef duy nhất và trả paymentUrl để chuyển khách sang cổng; kết quả cuối do webhook của cổng quyết định. Khoản không thuộc khách nhận 403 FORBIDDEN, không tìm thấy nhận 404 NOT_FOUND, sai thời điểm hoặc khoản lưu trú nhận 409 PAYMENT_NOT_DUE, cổng không được hỗ trợ nhận 400 VALIDATION_ERROR.")]
    public async Task<IActionResult> PayOnline(Guid id, [FromBody] OnlinePaymentRequest? request, CancellationToken ct)
    {
        if (request is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu yêu cầu không được để trống.");

        var result = await paymentService.StartOnlineAsync(
            User.ToCurrentUser(), id, request.Gateway!.Value, GetClientIp(), ct);

        return Ok(OnlinePaymentCreated.From(result));
    }

    [HttpGet("ipn/vnpay")]
    [AllowAnonymous]
    [EndpointSummary("Webhook VNPAY (IPN)")]
    [EndpointDescription("Không dùng JWT, xác thực bằng chữ ký của VNPAY trên các tham số query. Chữ ký sai hoặc thiếu nhận 401 UNAUTHENTICATED, ghi log bảo mật và không cập nhật trạng thái thanh toán.")]
    public IActionResult VnpayIpn()
    {
        var parameters = Request.Query.ToDictionary(
            query => query.Key, query => query.Value.ToString(), StringComparer.Ordinal);

        paymentService.VerifyIpnSignature(parameters);

        return Ok(VnpayIpnResponse.Unprocessed);
    }

    private string GetClientIp()
    {
        var address = HttpContext.Connection.RemoteIpAddress ?? IPAddress.Loopback;
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        if (IPAddress.IsLoopback(address)) return IPAddress.Loopback.ToString();
        return address.ToString();
    }
}
