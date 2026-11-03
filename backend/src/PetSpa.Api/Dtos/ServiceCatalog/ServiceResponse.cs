using System.Globalization;
using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record PricingRowResponse(
    Species Species, SizeGroup SizeGroup, long Price, int DurationMinutes, short StaffRequired);

public sealed record ServiceResponse(
    Guid ServiceId,
    string Name,
    string? Description,
    string LatestStartTime,
    bool IsActive,
    IReadOnlyList<PricingRowResponse> Pricing)
{
    public static ServiceResponse From(ServiceWithPricing item) => new(
        item.Service.ServiceId,
        item.Service.Name,
        item.Service.Description,
        item.Service.LatestStartTime.ToString("HH:mm", CultureInfo.InvariantCulture),
        item.Service.IsActive,
        item.Pricing
            .Select(p => new PricingRowResponse(p.Species, p.SizeGroup, (long)p.Price, p.DurationMinutes, p.StaffRequired))
            .ToList());
}
