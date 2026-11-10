using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Services;

public sealed record SpaServicePrice(Guid ServiceId, decimal Price);

public static class PricingService
{
    public static IReadOnlyList<SpaServicePrice> SpaServicePrices(
        Species species,
        SizeGroup sizeGroup,
        IEnumerable<Guid> serviceIds,
        IReadOnlyCollection<ServicePricing> pricing)
    {
        var prices = new List<SpaServicePrice>();

        foreach (var serviceId in serviceIds)
        {
            var row = pricing.FirstOrDefault(p =>
                    p.ServiceId == serviceId && p.Species == species && p.SizeGroup == sizeGroup)
                ?? throw new InvalidOperationException(
                    $"Thiếu giá của dịch vụ {serviceId} cho loài {species}, nhóm kích cỡ {sizeGroup}.");

            prices.Add(new SpaServicePrice(serviceId, row.Price));
        }

        return prices;
    }
}

