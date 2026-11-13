using System.Net;
using System.Security.Cryptography;
using System.Text;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Payments.Vnpay;

public sealed class VnpayPaymentGateway : IPaymentGateway
{
    public const string SandboxPaymentUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    private readonly VnpayPaymentRequestBuilder builder;
    private readonly byte[] secretKey;

    public VnpayPaymentGateway(VnpayOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        builder = new VnpayPaymentRequestBuilder(options);

        if (string.IsNullOrWhiteSpace(options.HashSecret))
        {
            throw new InvalidOperationException("Thiếu cấu hình Payment__Vnpay__HashSecret.");
        }

        secretKey = Encoding.UTF8.GetBytes(options.HashSecret);
    }

    public PaymentGateway Gateway => PaymentGateway.VNPAY;

    public string CreatePaymentUrl(PaymentTransaction transaction, string clientIp)
    {
        var payload = builder.Build(transaction, clientIp);

        var query = string.Join(
            '&',
            payload.Select(p => $"{WebUtility.UrlEncode(p.Key)}={WebUtility.UrlEncode(p.Value)}"));

        var secureHash = Convert.ToHexString(
            HMACSHA512.HashData(secretKey, Encoding.UTF8.GetBytes(query))).ToLowerInvariant();

        return $"{SandboxPaymentUrl}?{query}&vnp_SecureHash={secureHash}";
    }
}

