using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services;

public sealed class ServiceCatalogService(IServiceCatalogRepository repository)
{
    public Task<IReadOnlyList<ServiceWithPricing>> ListAsync(
        CurrentUser user, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default) =>
        repository.ListAsync(user.Role == UserRole.Manager, species, sizeGroup, ct);
}
