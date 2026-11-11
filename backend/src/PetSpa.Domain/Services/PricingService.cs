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
        ArgumentNullException.ThrowIfNull(serviceIds);
        ArgumentNullException.ThrowIfNull(pricing);

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

    public static decimal SpaAmount(
        Species species,
        SizeGroup sizeGroup,
        IEnumerable<Guid> serviceIds,
        IReadOnlyCollection<ServicePricing> pricing) =>
        SpaServicePrices(species, sizeGroup, serviceIds, pricing).Sum(p => p.Price);

    public static decimal StayAmount(
        Species species,
        SizeGroup sizeGroup,
        DateOnly checkInDate,
        DateOnly checkOutDate,
        IReadOnlyCollection<HotelPricing> pricing)
    {
        ArgumentNullException.ThrowIfNull(pricing);

        if (checkOutDate <= checkInDate)
            throw new ArgumentException("Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.");

        var row = pricing.FirstOrDefault(p => p.Species == species && p.SizeGroup == sizeGroup)
            ?? throw new InvalidOperationException(
                $"Thiếu giá lưu trú của loài {species}, nhóm kích cỡ {sizeGroup}.");

        var nights = checkOutDate.DayNumber - checkInDate.DayNumber;

        return nights * (row.PricePerNight + row.FoodPerNight);
    }

    public static decimal LateFee(
        DateTimeOffset plannedCheckOut,
        DateTimeOffset actualCheckOut,
        int graceMinutes,
        int blockMinutes,
        decimal feePerBlock)
    {
        if (blockMinutes <= 0)
            throw new ArgumentOutOfRangeException(nameof(blockMinutes), "Block minutes phải lớn hơn 0.");

        if (graceMinutes < 0)
            throw new ArgumentOutOfRangeException(nameof(graceMinutes), "Grace minutes không được âm.");

        if (feePerBlock < 0)
            throw new ArgumentOutOfRangeException(nameof(feePerBlock), "Fee per block không được âm.");

        var excess = actualCheckOut - plannedCheckOut - TimeSpan.FromMinutes(graceMinutes);
        if (excess <= TimeSpan.Zero) return 0m;

        long excessTicks = excess.Ticks;
        long blockTicks = TimeSpan.FromMinutes(blockMinutes).Ticks;
        long blocks = (excessTicks + blockTicks - 1) / blockTicks;

        return blocks * feePerBlock;
    }
}
