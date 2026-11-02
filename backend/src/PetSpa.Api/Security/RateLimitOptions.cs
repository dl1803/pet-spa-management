namespace PetSpa.Api.Security;

public sealed class RateLimitOptions
{
    public int AuthPermitPerMinute { get; set; } = 10;
    public int BookingPermitPerMinute { get; set; } = 10;
}
