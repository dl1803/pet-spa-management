using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
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

        // Vương (task 57): JWT Bearer
        return services;
    }
}

