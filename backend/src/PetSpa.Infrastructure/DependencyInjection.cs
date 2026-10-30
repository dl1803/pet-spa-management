using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using PetSpa.Application.Security;
using PetSpa.Infrastructure.Identity;
using PetSpa.Infrastructure.Persistence;

namespace PetSpa.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var connectionString = config.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Thiếu biến môi trường ConnectionStrings__Default.");

        services.AddDbContext<AppDbContext>(o => o.UseNpgsql(connectionString));

        services.AddIdentityCore<AppUser>()
            .AddEntityFrameworkStores<AppDbContext>();

        var jwt = config.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
        if (Encoding.UTF8.GetByteCount(jwt.SigningKey) < 32)
            throw new InvalidOperationException("Thiếu hoặc quá ngắn biến môi trường Jwt__SigningKey (tối thiểu 32 ký tự).");
        if (jwt.AccessTokenMinutes <= 0 || jwt.RefreshTokenDays <= 0)
            throw new InvalidOperationException("Jwt__AccessTokenMinutes và Jwt__RefreshTokenDays phải lớn hơn 0.");
        services.AddSingleton(jwt);

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Giữ nguyên tên claim "sub", "role" như trong token (không đổi sang tên dài của Microsoft).
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
                    ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
                    ValidateIssuer = false,    // chỉ một backend vừa phát hành vừa kiểm tra token
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero, // hết hạn đúng thời điểm, không cộng thêm 5 phút
                    NameClaimType = TokenClaims.UserId,
                    RoleClaimType = TokenClaims.Role,
                };
            });

        return services;
    }
}
