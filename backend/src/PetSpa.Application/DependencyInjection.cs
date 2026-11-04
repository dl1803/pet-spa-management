using Microsoft.Extensions.DependencyInjection;
using PetSpa.Application.Services;
using PetSpa.Application.Services.Auth;
using PetSpa.Application.Services.Pets;
using PetSpa.Application.Services.StaffManagement;

namespace PetSpa.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<PetService>();
        services.AddScoped<StaffService>();
        services.AddScoped<ServiceCatalogService>();
        services.AddScoped<AccountService>();
        services.AddScoped<AuthService>();
        return services;
    }
}
