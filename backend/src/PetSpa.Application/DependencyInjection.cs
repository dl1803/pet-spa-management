using Microsoft.Extensions.DependencyInjection;
using PetSpa.Application.Services.Pets;

namespace PetSpa.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<PetService>();
        return services;
    }
}

