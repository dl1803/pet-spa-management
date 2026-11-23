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
public sealed class PaymentsController(PaymentService paymentService, ILogger<PaymentsController> logger) : ControllerBase
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

    [HttpPost("{id}/counter")]
    [Authorize(Policy = AuthorizationPolicies.ReceptionistOrManager)]
    [EndpointSummary("Lễ tân hoặc quản lý ghi nhận thanh toán tại quầy")]
    [EndpointDescription("Chỉ lễ tân và quản lý. Body { method, receivedAmount } với method là Cash hoặc BankQR; số tiền phải trả do hệ thống xác định, client chỉ gửi số tiền thực nhận. Thành công trả { status } là Paid; lưu phương thức, số tiền thực nhận, thời điểm và người xác nhận. Thiếu hoặc sai method, receivedAmount nhận 400 VALIDATION_ERROR; không tìm thấy khoản thanh toán nhận 404 NOT_FOUND; sai thời điểm theo BR-07 hoặc khoản đã thanh toán nhận 409 PAYMENT_NOT_DUE; số tiền nhận thấp hơn số tiền phải trả nhận 409 AMOUNT_MISMATCH; khoản lưu trú khi lịch đang chờ khách xác nhận chi phí mới nhận 409 COST_CONFIRMATION_PENDING.")]
    public async Task<IActionResult> RecordCounter(Guid id, [FromBody] CounterPaymentRequest? request, CancellationToken ct)
    {
        if (request is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu yêu cầu không được để trống.");

        var status = await paymentService.RecordCounterAsync(
            User.ToCurrentUser(), id, request.Method!.Value, request.ReceivedAmount!.Value, ct);

        return Ok(new PaymentStatusResponse(status));
    }

    [HttpGet("ipn/vnpay")]
    [AllowAnonymous]
    [EndpointSummary("Webhook VNPAY (IPN)")]
    [EndpointDescription("Không dùng JWT, xác thực bằng chữ ký của VNPAY trên các tham số query. Luôn trả HTTP 200 kèm RspCode theo đặc tả VNPAY: 00 đã ghi nhận (thanh toán thành công, hoặc kết quả thất bại của cổng đã được lưu), 01 không tìm thấy giao dịch theo TxnRef, 02 giao dịch đã xử lý hoặc khoản thanh toán không còn chờ thanh toán, 04 số tiền cổng xác nhận không khớp số tiền cần thanh toán (không cập nhật, ghi log), 97 chữ ký sai hoặc thiếu (không cập nhật, ghi log), 99 thiếu tham số bắt buộc. Chỉ khi chữ ký hợp lệ, TxnRef đã tạo, kết quả thành công và số tiền khớp đủ thì khoản thanh toán mới chuyển Đã thanh toán (Online); callback lặp cùng TxnRef bị bỏ qua.")]
    public async Task<IActionResult> VnpayIpn(CancellationToken ct)
    {
        var parameters = Request.Query.ToDictionary(
            query => query.Key, query => query.Value.ToString(), StringComparer.Ordinal);

        if (!paymentService.VerifyIpnSignature(parameters))
        {
            logger.LogWarning(
                "Sự kiện bảo mật: webhook VNPAY bị từ chối do chữ ký không hợp lệ, IP {ClientIp}", GetClientIp());
            return Ok(VnpayIpnResponse.InvalidChecksum);
        }

        try
        {
            var result = await paymentService.ProcessCallbackAsync(parameters, ct);
            LogCallback(result);

            return Ok(VnpayIpnResponse.From(result.Status));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Lỗi khi xử lý webhook VNPAY: {Message}", ex.Message);
            return Ok(VnpayIpnResponse.Unprocessed);
        }
    }

    private void LogCallback(PaymentCallbackResult result)
    {
        switch (result.Status)
        {
            case PaymentCallbackStatus.Paid:
                logger.LogInformation(
                    "Webhook VNPAY: đã ghi nhận thanh toán {PaymentId} qua giao dịch {TxnRef}, số tiền {ConfirmedAmount}",
                    result.PaymentId, result.TxnRef, result.ConfirmedAmount);
                break;
            case PaymentCallbackStatus.Failed:
                logger.LogInformation(
                    "Webhook VNPAY: giao dịch {TxnRef} không thành công tại cổng, khoản thanh toán {PaymentId} giữ nguyên Chưa thanh toán",
                    result.TxnRef, result.PaymentId);
                break;
            case PaymentCallbackStatus.AlreadyProcessed:
                logger.LogInformation(
                    "Webhook VNPAY: bỏ qua giao dịch {TxnRef}, đã xử lý hoặc khoản thanh toán {PaymentId} không còn chờ thanh toán",
                    result.TxnRef, result.PaymentId);
                break;
            case PaymentCallbackStatus.AmountMismatch:
                logger.LogWarning(
                    "Sự kiện bảo mật: webhook VNPAY lệch số tiền, giao dịch {TxnRef}, khoản thanh toán {PaymentId}, cần {ExpectedAmount}, cổng xác nhận {ConfirmedAmount}; không cập nhật",
                    result.TxnRef, result.PaymentId, result.ExpectedAmount, result.ConfirmedAmount);
                break;
            case PaymentCallbackStatus.TxnNotFound:
                logger.LogWarning("Webhook VNPAY: không tìm thấy giao dịch {TxnRef}", result.TxnRef);
                break;
            case PaymentCallbackStatus.Malformed:
                logger.LogWarning("Webhook VNPAY: thiếu hoặc sai tham số bắt buộc, không xử lý");
                break;
        }
    }

    private string GetClientIp()
    {
        var address = HttpContext.Connection.RemoteIpAddress ?? IPAddress.Loopback;
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        if (IPAddress.IsLoopback(address)) return IPAddress.Loopback.ToString();
        return address.ToString();
    }
}
