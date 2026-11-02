using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services;

public sealed class ServiceCatalogService(IServiceCatalogRepository repository)
{
    public Task<IReadOnlyList<ServiceWithPricing>> ListAsync(
        CurrentUser user, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default) =>
        repository.ListAsync(user.Role == UserRole.Manager, species, sizeGroup, ct);

    public async Task<Guid> CreateAsync(ServiceInput input, CancellationToken ct = default)
    {
        await EnsureValidAsync(input, ct);

        var serviceId = Guid.NewGuid();
        await repository.AddAsync(ToService(serviceId, input), ToPricing(serviceId, input), ct);
        return serviceId;
    }

    private async Task EnsureValidAsync(ServiceInput input, CancellationToken ct)
    {
        var slotTimes = await repository.GetSlotTimesAsync(ct);
        if (!slotTimes.Contains(input.LatestStartTime))
            throw new BusinessException(
                ErrorCodes.ValidationError,
                "Mốc giờ bắt đầu muộn nhất phải thuộc danh sách mốc giờ đặt lịch.");

        var sizeRules = await repository.GetSizeRulesAsync(ct);
        foreach (var rowsOfSpecies in input.Pricing.GroupBy(p => p.Species))
        {
            var expectedGroups = GetSizeGroups(sizeRules, rowsOfSpecies.Key);
            var providedGroups = rowsOfSpecies.Select(p => p.SizeGroup).ToList();

            if (providedGroups.Count != expectedGroups.Count || !expectedGroups.ToHashSet().SetEquals(providedGroups))
                throw new BusinessException(
                    ErrorCodes.ValidationError,
                    $"Loài {rowsOfSpecies.Key} phải có đủ và không trùng giá, thời lượng, số nhân viên cho các nhóm kích cỡ: {string.Join(", ", expectedGroups)}.");
        }
    }

    private static List<SizeGroup> GetSizeGroups(IReadOnlyList<SizeRule> sizeRules, Species species)
    {
        var rulesOfSpecies = sizeRules.Where(r => r.Species == species).ToList();
        if (rulesOfSpecies.Count == 0) return new List<SizeGroup>();

        return rulesOfSpecies.Any(r => r.MediumUpper is null)
            ? new List<SizeGroup> { SizeGroup.Small, SizeGroup.Large }
            : new List<SizeGroup> { SizeGroup.Small, SizeGroup.Medium, SizeGroup.Large };
    }

    private static Service ToService(Guid serviceId, ServiceInput input) => new()
    {
        ServiceId = serviceId,
        Name = input.Name.Trim(),
        Description = input.Description,
        LatestStartTime = input.LatestStartTime,
    };

    private static List<ServicePricing> ToPricing(Guid serviceId, ServiceInput input) =>
        input.Pricing.Select(p => new ServicePricing
        {
            ServiceId = serviceId,
            Species = p.Species,
            SizeGroup = p.SizeGroup,
            Price = p.Price,
            DurationMinutes = p.DurationMinutes,
            StaffRequired = p.StaffRequired,
        }).ToList();
}
