using Microsoft.EntityFrameworkCore;
using Npgsql;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class HotelCatalogRepository(AppDbContext db) : IHotelCatalogRepository
{
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

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}

