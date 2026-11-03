using System.Globalization;
using PetSpa.Application.Services;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record PricingRowRequest(
    Species? Species, SizeGroup? SizeGroup, long? Price, int? DurationMinutes, short? StaffRequired);

public sealed record ServiceRequest(
    string Name, string? Description, string LatestStartTime, IReadOnlyList<PricingRowRequest> Pricing)
{
    public ServiceInput ToInput() => new(
        Name,
        Description,
        TimeOnly.ParseExact(LatestStartTime, "HH:mm", CultureInfo.InvariantCulture),
        Pricing.Select(p => new PricingInput(
            p.Species!.Value,
            p.SizeGroup!.Value,
            p.Price!.Value,
            p.DurationMinutes!.Value,
            p.StaffRequired!.Value)).ToList());
}
