using System.Globalization;
using System.Net;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Payments.Vnpay;

public sealed class VnpayPaymentRequestBuilder
{
    public const string Version = "2.1.0";
    public const string Command = "pay";
    public const string CurrencyCode = "VND";
    public const string Locale = "vn";
    public const string OrderType = "other";

    public static readonly TimeSpan PaymentWindow = TimeSpan.FromMinutes(15);

    private const int TxnRefMaxLength = 64;
    private const decimal MaxAmountVnd = 9_999_999_999m;
    private const string TimestampFormat = "yyyyMMddHHmmss";
    private static readonly TimeSpan GatewayOffset = TimeSpan.FromHours(7);

    private readonly string tmnCode;
    private readonly string returnUrl;

    public VnpayPaymentRequestBuilder(VnpayOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var code = options.TmnCode ?? string.Empty;
        if (code.Length != 8 || !code.All(char.IsAsciiLetterOrDigit))
        {
            throw new InvalidOperationException(
                "Thiếu hoặc sai cấu hình Payment__Vnpay__TmnCode (8 ký tự chữ và số).");
        }

        var url = options.ReturnUrl ?? string.Empty;
        var validUrl = Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
            && url.Length is >= 10 and <= 255;
        if (!validUrl)
        {
            throw new InvalidOperationException(
                "Thiếu hoặc sai cấu hình Payment__Vnpay__ReturnUrl (URL http/https tuyệt đối, 10–255 ký tự).");
        }

        tmnCode = code;
        returnUrl = url;
    }

    public SortedDictionary<string, string> Build(PaymentTransaction transaction, string ipAddress)
    {
        ArgumentNullException.ThrowIfNull(transaction);

        if (transaction.Gateway != PaymentGateway.VNPAY)
        {
            throw new ArgumentException("Giao dịch không thuộc cổng VNPAY.", nameof(transaction));
        }

        var txnRef = transaction.TxnRef;
        if (string.IsNullOrEmpty(txnRef)
            || txnRef.Length > TxnRefMaxLength
            || !txnRef.All(char.IsAsciiLetterOrDigit))
        {
            throw new ArgumentException(
                "TxnRef phải gồm 1–64 ký tự chữ và số, không dấu.", nameof(transaction));
        }

        var amount = transaction.RequestedAmount;
        if (amount <= 0 || amount > MaxAmountVnd || amount != decimal.Truncate(amount))
        {
            throw new ArgumentOutOfRangeException(
                nameof(transaction), "RequestedAmount phải là số nguyên VND từ 1 đến 9.999.999.999.");
        }

        if (!IPAddress.TryParse(ipAddress, out _))
        {
            throw new ArgumentException("Địa chỉ IP của khách không hợp lệ.", nameof(ipAddress));
        }

        var createdAt = transaction.CreatedAt.ToOffset(GatewayOffset);
        var expireAt = createdAt + PaymentWindow;

        return new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Version"] = Version,
            ["vnp_Command"] = Command,
            ["vnp_TmnCode"] = tmnCode,
            ["vnp_Amount"] = ((long)amount * 100).ToString(CultureInfo.InvariantCulture),
            ["vnp_CreateDate"] = createdAt.ToString(TimestampFormat, CultureInfo.InvariantCulture),
            ["vnp_CurrCode"] = CurrencyCode,
            ["vnp_IpAddr"] = ipAddress,
            ["vnp_Locale"] = Locale,
            ["vnp_OrderInfo"] = $"Thanh toan lich hen {txnRef}",
            ["vnp_OrderType"] = OrderType,
            ["vnp_ReturnUrl"] = returnUrl,
            ["vnp_ExpireDate"] = expireAt.ToString(TimestampFormat, CultureInfo.InvariantCulture),
            ["vnp_TxnRef"] = txnRef,
        };
    }
}
