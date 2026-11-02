using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class ServiceCatalogRepository(AppDbContext db) : IServiceCatalogRepository
{
    public async Task<IReadOnlyList<ServiceWithPricing>> ListAsync(
        bool includeInactive, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default)
    {
        var services = db.Set<Service>().AsNoTracking();
        if (!includeInactive) services = services.Where(s => s.IsActive);

        var serviceList = await services.OrderBy(s => s.Name).ToListAsync(ct);
        var serviceIds = serviceList.Select(s => s.ServiceId).ToList();

        var pricing = db.Set<ServicePricing>().AsNoTracking().Where(p => serviceIds.Contains(p.ServiceId));
        if (species is not null) pricing = pricing.Where(p => p.Species == species.Value);
        if (sizeGroup is not null) pricing = pricing.Where(p => p.SizeGroup == sizeGroup.Value);

        var pricingByService = (await pricing.ToListAsync(ct)).ToLookup(p => p.ServiceId);

        var result = serviceList
            .Select(s => new ServiceWithPricing(
                s,
                pricingByService[s.ServiceId].OrderBy(p => p.Species).ThenBy(p => p.SizeGroup).ToList()))
            .ToList();

        if (species is not null || sizeGroup is not null)
            result = result.Where(x => x.Pricing.Count > 0).ToList();

        return result;
    }
}
