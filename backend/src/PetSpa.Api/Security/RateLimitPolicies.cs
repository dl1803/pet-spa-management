using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using PetSpa.Application.Security;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Security;

public static class RateLimitPolicies
{
    public const string Auth = "Auth";
    public const string Booking = "Booking";

    public static IServiceCollection AddPetSpaRateLimiting(this IServiceCollection services, IConfiguration config)
    {
        var limits = config.GetSection("RateLimit").Get<RateLimitOptions>() ?? new RateLimitOptions();
        if (limits.AuthPermitPerMinute <= 0 || limits.BookingPermitPerMinute <= 0)
            throw new InvalidOperationException("RateLimit__AuthPermitPerMinute và RateLimit__BookingPermitPerMinute phải lớn hơn 0.");

        services.AddRateLimiter(options =>
        {
            options.OnRejected = (_, _) => throw new BusinessException(ErrorCodes.RateLimited);

            options.AddPolicy(Auth, context => RateLimitPartition.GetFixedWindowLimiter(
                GetClientIp(context),
                _ => FixedWindow(limits.AuthPermitPerMinute)));

            options.AddPolicy(Booking, context => RateLimitPartition.GetFixedWindowLimiter(
                context.User.FindFirst(TokenClaims.UserId)?.Value ?? GetClientIp(context),
                _ => FixedWindow(limits.BookingPermitPerMinute)));
        });

        return services;
    }

    private static FixedWindowRateLimiterOptions FixedWindow(int permitLimit) => new()
    {
        PermitLimit = permitLimit,
        Window = TimeSpan.FromMinutes(1),
        QueueLimit = 0,
    };

    private static string GetClientIp(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}
