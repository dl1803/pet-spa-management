using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services;

public sealed record PricingInput(
    Species Species, SizeGroup SizeGroup, decimal Price, int DurationMinutes, short StaffRequired);

public sealed record ServiceInput(
    string Name, string? Description, TimeOnly LatestStartTime, IReadOnlyList<PricingInput> Pricing);
