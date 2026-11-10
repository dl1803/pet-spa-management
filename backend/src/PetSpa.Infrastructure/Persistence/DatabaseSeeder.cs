using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Infrastructure.Identity;

namespace PetSpa.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    private const long SeederLockKey = 543210987654321L;

    public static async Task SeedDatabaseAsync(this IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseSeeder");

        var isPostgreSql = db.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true;

        if (isPostgreSql)
        {
            await db.Database.ExecuteSqlRawAsync($"SELECT pg_advisory_lock({SeederLockKey});", ct);
        }

        try
        {
            await db.Database.MigrateAsync(ct);

            await SeedSizeRulesAsync(db, logger, ct);
            await SeedWeightTolerancesAsync(db, logger, ct);
            await SeedSystemConfigAsync(db, logger, ct);
            await SeedManagerAsync(db, userManager, configuration, logger, ct);
        }
        finally
        {
            if (isPostgreSql)
            {
                await db.Database.ExecuteSqlRawAsync($"SELECT pg_advisory_unlock({SeederLockKey});", CancellationToken.None);
            }
        }
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

    private static async Task SeedSystemConfigAsync(AppDbContext db, ILogger logger, CancellationToken ct)
    {
        if (await db.Set<SystemConfig>().AnyAsync(ct)) return;

        var configs = new[]
        {
            new SystemConfig { ConfigKey = "Booking.ChangeCancelDeadlineMinutes", ConfigValue = "60", Description = "Hạn tự đổi/hủy miễn phí trước giờ hẹn (phút), cho phép 60–120 (BR-08, A-03)" },
            new SystemConfig { ConfigKey = "Booking.HoldMinutes", ConfigValue = "15", Description = "Thời gian giữ chỗ tối đa sau giờ hẹn (phút) trước khi tự hủy do vắng mặt (BR-08, A-04)" },
            new SystemConfig { ConfigKey = "Booking.BufferMinutes", ConfigValue = "15", Description = "Thời gian dọn dẹp sau lịch spa (phút), cho phép 15–20 (X-06)" },
            new SystemConfig { ConfigKey = "Booking.SlotTimes", ConfigValue = "09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00,18:00,19:00", Description = "Các mốc giờ bắt đầu lịch spa, định dạng HH:mm tăng dần, ngăn cách bằng dấu phẩy (X-06)" },
            new SystemConfig { ConfigKey = "Suggest.LookbackDays", ConfigValue = "30", Description = "Số ngày gần nhất dùng để đếm số lịch đã phân công khi đề xuất nhân viên (X-11)" },
            new SystemConfig { ConfigKey = "NoShow.LockThreshold", ConfigValue = "3", Description = "Khóa tự đặt lịch khi số lần vắng mặt vượt ngưỡng này (BR-15, A-05)" },
            new SystemConfig { ConfigKey = "NoShow.WindowDays", ConfigValue = "30", Description = "Cửa sổ đếm số lần vắng mặt (ngày) (BR-15, A-05)" },
            new SystemConfig { ConfigKey = "CostConfirm.TimeoutMinutes", ConfigValue = "30", Description = "Thời gian khách xác nhận chi phí mới trước khi tự hủy (phút) (BR-23)" },
            new SystemConfig { ConfigKey = "Hotel.LateGraceMinutes", ConfigValue = "30", Description = "Số phút trả muộn được miễn phí phạt (BR-22)" },
            new SystemConfig { ConfigKey = "Hotel.LateBlockMinutes", ConfigValue = "60", Description = "Độ dài mỗi khối tính phí phạt trả muộn (phút) (BR-22)" },
            new SystemConfig { ConfigKey = "Hotel.LateFeePerBlock", ConfigValue = "0", Description = "Mức phí phạt trả muộn mỗi lần (VND), do quản lý thiết lập (BR-22, FR-HTL-03)" },
            new SystemConfig { ConfigKey = "Photo.ValidityDays", ConfigValue = "7", Description = "Số ngày hiệu lực của ảnh trước chăm sóc (BR-20)" },
        };

        db.Set<SystemConfig>().AddRange(configs);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Đã seed {Count} dòng SystemConfig.", configs.Length);
    }

    private static async Task SeedManagerAsync(
        AppDbContext db,
        UserManager<AppUser> userManager,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken ct)
    {
        if (await db.Users.AnyAsync(u => u.Role == UserRole.Manager, ct)) return;

        var userName = configuration["Seed:ManagerUserName"]?.Trim();
        var password = configuration["Seed:ManagerPassword"];

        if (string.IsNullOrEmpty(userName) || string.IsNullOrEmpty(password))
        {
            logger.LogWarning("Chưa có tài khoản Quản lý và thiếu Seed__ManagerUserName hoặc Seed__ManagerPassword; bỏ qua bước tạo tài khoản Quản lý.");
            return;
        }

        if (userName.Length > 20)
            throw new InvalidOperationException("Seed__ManagerUserName tối đa 20 ký tự.");

        var manager = new AppUser { Id = Guid.NewGuid(), UserName = userName, Role = UserRole.Manager };
        var result = await userManager.CreateAsync(manager, password);
        if (!result.Succeeded)
            throw new InvalidOperationException(
                "Không tạo được tài khoản Quản lý: " + string.Join("; ", result.Errors.Select(e => e.Description)));

        logger.LogInformation("Đã tạo tài khoản Quản lý đầu tiên.");
    }
}
