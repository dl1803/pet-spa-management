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

    private const string ParameterPrefix = "vnp_";
    private const string SecureHashParameter = "vnp_SecureHash";
    private const string SecureHashTypeParameter = "vnp_SecureHashType";

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
        var query = BuildQuery(builder.Build(transaction, clientIp));

        return $"{SandboxPaymentUrl}?{query}&{SecureHashParameter}={ComputeSecureHash(query)}";
    }

    public bool VerifyCallbackSignature(IReadOnlyDictionary<string, string> parameters)
    {
        ArgumentNullException.ThrowIfNull(parameters);

        if (!parameters.TryGetValue(SecureHashParameter, out var receivedHash) || string.IsNullOrEmpty(receivedHash))
        {
            return false;
        }

        var signed = new SortedDictionary<string, string>(StringComparer.Ordinal);
        foreach (var (key, value) in parameters)
        {
            if (key.StartsWith(ParameterPrefix, StringComparison.Ordinal)
                && key != SecureHashParameter
                && key != SecureHashTypeParameter
                && !string.IsNullOrEmpty(value))
            {
                signed[key] = value;
            }
        }

        var expected = Encoding.ASCII.GetBytes(ComputeSecureHash(BuildQuery(signed)));
        var received = Encoding.ASCII.GetBytes(receivedHash.ToLowerInvariant());

        return CryptographicOperations.FixedTimeEquals(expected, received);
    }

    private static string BuildQuery(IEnumerable<KeyValuePair<string, string>> payload) =>
        string.Join('&', payload.Select(p => $"{WebUtility.UrlEncode(p.Key)}={WebUtility.UrlEncode(p.Value)}"));

    private string ComputeSecureHash(string data) =>
        Convert.ToHexString(HMACSHA512.HashData(secretKey, Encoding.UTF8.GetBytes(data))).ToLowerInvariant();
}
