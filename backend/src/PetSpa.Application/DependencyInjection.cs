using Microsoft.Extensions.DependencyInjection;
using PetSpa.Application.Services.StaffManagement;

namespace PetSpa.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<StaffService>();
        return services;
    }
}
