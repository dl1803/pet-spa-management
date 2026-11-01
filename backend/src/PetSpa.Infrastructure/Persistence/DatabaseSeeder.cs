using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedDatabaseAsync(this IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseSeeder");

        await SeedSizeRulesAsync(db, logger, ct);
        await SeedWeightTolerancesAsync(db, logger, ct);
    }

    private static async Task SeedSizeRulesAsync(AppDbContext db, ILogger logger, CancellationToken ct)
    {
        if (await db.Set<SizeRule>().AnyAsync(ct)) return;

        var rules = new[]
        {
            new SizeRule { Species = Species.Dog, Criterion = SizeCriterion.Weight, SmallUpper = 10m, MediumUpper = 25m },
            new SizeRule { Species = Species.Dog, Criterion = SizeCriterion.Height, SmallUpper = 35m, MediumUpper = 55m },
            new SizeRule { Species = Species.Cat, Criterion = SizeCriterion.Weight, SmallUpper = 3m, MediumUpper = 5m },
            new SizeRule { Species = Species.Rabbit, Criterion = SizeCriterion.Weight, SmallUpper = 1.5m, MediumUpper = 3m },
            new SizeRule { Species = Species.GuineaPig, Criterion = SizeCriterion.Weight, SmallUpper = 1m, MediumUpper = null },
        };

        db.Set<SizeRule>().AddRange(rules);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Đã seed {Count} dòng SizeRule.", rules.Length);
    }

    private static async Task SeedWeightTolerancesAsync(AppDbContext db, ILogger logger, CancellationToken ct)
    {
        if (await db.Set<WeightTolerance>().AnyAsync(ct)) return;

        var tolerances = new[]
        {
            new WeightTolerance { Species = Species.GuineaPig, FromGroup = SizeGroup.Small, ToGroup = SizeGroup.Large, ToleranceKg = 0.2m },
            new WeightTolerance { Species = Species.Rabbit, FromGroup = SizeGroup.Small, ToGroup = SizeGroup.Medium, ToleranceKg = 0.3m },
            new WeightTolerance { Species = Species.Rabbit, FromGroup = SizeGroup.Medium, ToGroup = SizeGroup.Large, ToleranceKg = 0.3m },
            new WeightTolerance { Species = Species.Cat, FromGroup = SizeGroup.Small, ToGroup = SizeGroup.Medium, ToleranceKg = 0.5m },
            new WeightTolerance { Species = Species.Cat, FromGroup = SizeGroup.Medium, ToGroup = SizeGroup.Large, ToleranceKg = 0.5m },
            new WeightTolerance { Species = Species.Dog, FromGroup = SizeGroup.Small, ToGroup = SizeGroup.Medium, ToleranceKg = 1.5m },
            new WeightTolerance { Species = Species.Dog, FromGroup = SizeGroup.Medium, ToGroup = SizeGroup.Large, ToleranceKg = 2.5m },
        };

        db.Set<WeightTolerance>().AddRange(tolerances);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Đã seed {Count} dòng WeightTolerance.", tolerances.Length);
    }
}
