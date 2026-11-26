using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class HotelCatalogRepository(AppDbContext db) : IHotelCatalogRepository
{
    private const string LateFeeKey = "Hotel.LateFeePerBlock";
    private const string LateGraceKey = "Hotel.LateGraceMinutes";
    private const string LateBlockKey = "Hotel.LateBlockMinutes";

    public async Task AddCageAsync(Cage cage, CancellationToken ct = default)
    {
        db.Set<Cage>().Add(cage);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new BusinessException(ErrorCodes.DuplicateCageCode);
        }
    }

    public async Task<bool> UpdateCageAsync(
        Guid cageId, string? code, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default)
    {
        var cage = await db.Set<Cage>().FirstOrDefaultAsync(c => c.CageId == cageId, ct);
        if (cage is null) return false;

        if (code is not null) cage.Code = code;
        if (species is not null) cage.Species = species.Value;
        if (sizeGroup is not null) cage.SizeGroup = sizeGroup.Value;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new BusinessException(ErrorCodes.DuplicateCageCode);
        }

        return true;
    }

    public async Task<bool> SetCageActiveAsync(Guid cageId, bool isActive, CancellationToken ct = default)
    {
        var affected = await db.Set<Cage>()
            .Where(c => c.CageId == cageId)
            .ExecuteUpdateAsync(c => c.SetProperty(x => x.IsActive, isActive), ct);

        return affected > 0;
    }

    public async Task<PagedResult<CageStatus>> ListCageStatusesAsync(
        int page, int pageSize, CancellationToken ct = default)
    {
        var cages = db.Set<Cage>().AsNoTracking();

        var total = await cages.CountAsync(ct);
        var items = await cages
            .OrderBy(c => c.Code)
            .ThenBy(c => c.CageId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var cageIds = items.Select(c => c.CageId).ToList();

        var occupants = await (
            from stay in db.Set<HotelAppointment>().AsNoTracking()
            join pet in db.Set<Pet>().AsNoTracking() on stay.PetId equals pet.PetId
            join customer in db.Set<Customer>().AsNoTracking() on stay.CustomerId equals customer.CustomerId
            where stay.Status == AppointmentStatus.InStay
                && stay.CageId != null
                && cageIds.Contains(stay.CageId.Value)
            orderby stay.PlannedCheckIn
            select new
            {
                stay.CageId,
                PetId = pet.PetId,
                PetName = pet.Name,
                CustomerId = customer.CustomerId,
                CustomerName = customer.FullName,
                stay.PlannedCheckOut,
            })
            .ToListAsync(ct);

        var occupantByCage = occupants
            .GroupBy(o => o.CageId!.Value)
            .ToDictionary(g => g.Key, g => g.First());

        var statuses = items
            .Select(c => new CageStatus(
                c,
                occupantByCage.TryGetValue(c.CageId, out var o)
                    ? new CageOccupant(o.PetId, o.PetName, o.CustomerId, o.CustomerName, o.PlannedCheckOut)
                    : null))
            .ToList();

        return new PagedResult<CageStatus>(statuses, page, pageSize, total);
    }

    public async Task<IReadOnlyList<HotelPricing>> ListPricingAsync(CancellationToken ct = default) =>
        await db.Set<HotelPricing>()
            .AsNoTracking()
            .OrderBy(p => p.Species)
            .ThenBy(p => p.SizeGroup)
            .ToListAsync(ct);

    public async Task<decimal> GetLateFeePerBlockAsync(CancellationToken ct = default)
    {
        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == LateFeeKey)
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        return decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var fee)
            ? fee
            : 0m;
    }

    public async Task<int> GetLateGraceMinutesAsync(CancellationToken ct = default)
    {
        const int defaultGraceMinutes = 30;

        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == LateGraceKey)
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var minutes) && minutes >= 0
            ? minutes
            : defaultGraceMinutes;
    }

    public async Task<int> GetLateBlockMinutesAsync(CancellationToken ct = default)
    {
        const int defaultBlockMinutes = 60;

        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == LateBlockKey)
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var minutes) && minutes > 0
            ? minutes
            : defaultBlockMinutes;
    }

    public async Task SetLodgingPricesAsync(
        IReadOnlyList<HotelPricing> prices, decimal lateFeePerBlock, CancellationToken ct = default)
    {
        var current = await db.Set<HotelPricing>().ToListAsync(ct);

        foreach (var price in prices)
        {
            var existing = current.FirstOrDefault(p => p.Species == price.Species && p.SizeGroup == price.SizeGroup);
            if (existing is null)
            {
                db.Set<HotelPricing>().Add(price);
            }
            else
            {
                existing.PricePerNight = price.PricePerNight;
                existing.FoodPerNight = price.FoodPerNight;
            }
        }

        var value = lateFeePerBlock.ToString("0", CultureInfo.InvariantCulture);
        var config = await db.Set<SystemConfig>().FirstOrDefaultAsync(c => c.ConfigKey == LateFeeKey, ct);
        if (config is null)
        {
            db.Set<SystemConfig>().Add(new SystemConfig
            {
                ConfigKey = LateFeeKey,
                ConfigValue = value,
                Description = "Mức phí phạt trả muộn mỗi lần (VND), do quản lý thiết lập (BR-22, FR-HTL-03)",
            });
        }
        else
        {
            config.ConfigValue = value;
        }

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            await db.Set<SystemConfig>()
                .Where(c => c.ConfigKey == LateFeeKey)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.ConfigValue, value), ct);
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}

