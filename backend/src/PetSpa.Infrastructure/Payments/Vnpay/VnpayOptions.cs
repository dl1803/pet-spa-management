namespace PetSpa.Infrastructure.Payments.Vnpay;

public sealed class VnpayOptions
{
    public string TmnCode { get; set; } = string.Empty;
    public string HashSecret { get; set; } = string.Empty;
    public string ReturnUrl { get; set; } = string.Empty;
}
