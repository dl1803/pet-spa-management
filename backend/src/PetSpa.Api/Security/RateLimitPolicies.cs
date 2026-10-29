using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Security;

public static class RateLimitPolicies
{
    public const string Auth = "Auth";

    public static IServiceCollection AddPetSpaRateLimiting(this IServiceCollection services, IConfiguration config)
    {
        var limits = config.GetSection("RateLimit").Get<RateLimitOptions>() ?? new RateLimitOptions();
        if (limits.AuthPermitPerMinute <= 0)
        {
            throw new InvalidOperationException("RateLimit__AuthPermitPerMinute phải lớn hơn 0.");
        }

        services.AddRateLimiter(options =>
        {
            options.OnRejected = (_, _) => throw new BusinessException(ErrorCodes.RateLimited);

            options.AddPolicy(Auth, context => RateLimitPartition.GetFixedWindowLimiter(
                GetClientIp(context),
                _ => FixedWindow(limits.AuthPermitPerMinute)));
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

