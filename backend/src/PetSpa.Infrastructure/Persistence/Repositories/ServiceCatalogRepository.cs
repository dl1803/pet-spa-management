using System.Globalization;
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

    public async Task AddAsync(Service service, IReadOnlyList<ServicePricing> pricing, CancellationToken ct = default)
    {
        db.Set<Service>().Add(service);
        db.Set<ServicePricing>().AddRange(pricing);
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<TimeOnly>> GetSlotTimesAsync(CancellationToken ct = default)
    {
        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "Booking.SlotTimes")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        if (value is null) throw new InvalidOperationException("Thiếu cấu hình Booking.SlotTimes.");

        return value
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(t => TimeOnly.ParseExact(t, "HH:mm", CultureInfo.InvariantCulture))
            .ToList();
    }

    public async Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(CancellationToken ct = default) =>
        await db.Set<SizeRule>().AsNoTracking().ToListAsync(ct);

    public async Task<bool> UpdateAsync(
        Service service, IReadOnlyList<ServicePricing> pricing, CancellationToken ct = default)
    {
        var existing = await db.Set<Service>().FirstOrDefaultAsync(s => s.ServiceId == service.ServiceId, ct);
        if (existing is null) return false;

        existing.Name = service.Name;
        existing.Description = service.Description;
        existing.LatestStartTime = service.LatestStartTime;

        var currentRows = await db.Set<ServicePricing>()
            .Where(p => p.ServiceId == service.ServiceId)
            .ToListAsync(ct);

        foreach (var row in currentRows)
        {
            var next = pricing.FirstOrDefault(p => p.Species == row.Species && p.SizeGroup == row.SizeGroup);
            if (next is null)
            {
                db.Set<ServicePricing>().Remove(row);
                continue;
            }

            row.Price = next.Price;
            row.DurationMinutes = next.DurationMinutes;
            row.StaffRequired = next.StaffRequired;
        }

        var newRows = pricing
            .Where(p => !currentRows.Any(c => c.Species == p.Species && c.SizeGroup == p.SizeGroup))
            .ToList();
        db.Set<ServicePricing>().AddRange(newRows);

        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SetActiveAsync(Guid serviceId, bool isActive, CancellationToken ct = default)
    {
        var affected = await db.Set<Service>()
            .Where(s => s.ServiceId == serviceId)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsActive, isActive), ct);

        return affected > 0;
    }
}
