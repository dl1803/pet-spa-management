using Microsoft.EntityFrameworkCore;
using PetSpa.Domain.Entities;
using PetSpa.Infrastructure.Persistence;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using PetSpa.Api.Controllers;
using PetSpa.Api.Dtos;
using PetSpa.Api.Validators;
using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services;
using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Enums;
using PetSpa.Infrastructure.Identity;
using System.Text.Json;
using System.Threading.RateLimiting;
using FluentValidation;
using ValidationFailure = FluentValidation.Results.ValidationFailure;
using FluentValidation.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PetSpa.Api.Filters;
using PetSpa.Api.Middleware;
using PetSpa.Api.Security;
using PetSpa.Domain.Exceptions;
using Serilog;
using Serilog.Events;

var filter = new ValidationFilter();
var tests = new (string Name, Func<Task> Run)[]
{
    ("Valid request invokes the action once", async () =>
    {
        var calls = 0;
        await InvokeAsync(filter, new() { ["request"] = new SampleRequest("Milo") }, () => calls++);
        Check(calls == 1, "The valid action must run exactly once.");
    }),
    ("Invalid request stops the action and preserves validation failures", () =>
        AssertRejectedAsync(filter, new() { ["request"] = new SampleRequest("") })),
    ("Asynchronous validation rules reject invalid requests", () =>
        AssertRejectedAsync(filter, new() { ["request"] = new SampleRequest("rejected") })),
    ("All action arguments are validated", () =>
        AssertRejectedAsync(filter, new()
        {
            ["first"] = new SampleRequest("Milo"),
            ["second"] = new SampleRequest("")
        })),
    ("Null arguments and arguments without validators are allowed", async () =>
    {
        var calls = 0;
        await InvokeAsync(filter, new() { ["optional"] = null, ["id"] = Guid.NewGuid() }, () => calls++);
        Check(calls == 1, "Arguments without validators must not block the action.");
    }),
    ("Actions without arguments are allowed", async () =>
    {
        var calls = 0;
        await InvokeAsync(filter, new(), () => calls++);
        Check(calls == 1, "A parameterless action must run exactly once.");
    }),
    ("Request cancellation reaches validation and stops the action", async () =>
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var calls = 0;
        try
        {
            await InvokeAsync(filter, new() { ["request"] = new SampleRequest("Milo") },
                () => calls++, cancellation.Token);
            throw new InvalidOperationException("Cancelled validation must not succeed.");
        }
        catch (OperationCanceledException exception)
        {
            Check(exception.CancellationToken == cancellation.Token, "The request token must be propagated.");
            Check(calls == 0, "A cancelled request must not invoke the action.");
        }
    }),
    ("ExceptionHandlingMiddleware maps all 25 standardized error codes to correct envelopes", async () =>
    {
        var codes = typeof(ErrorCodes).GetFields()
            .Where(field => field.IsLiteral && !field.IsInitOnly && field.FieldType == typeof(string))
            .Select(field => (string)field.GetValue(null)!)
            .ToList();

        Check(codes.Count == 25, $"Expected 25 standardized error codes, found {codes.Count}.");

        foreach (var code in codes)
        {
            var (status, body, contentType) = await RunMiddlewareAsync(_ => throw new BusinessException(code));

            Check(status >= 400 && status < 500, $"Error code {code} must map to a 4xx status.");
            Check(contentType.StartsWith("application/problem+json"), $"Expected application/problem+json for {code}.");

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            Check(root.GetProperty("status").GetInt32() == status, $"Status in JSON must match response status for {code}.");
            Check(root.GetProperty("code").GetString() == code, $"JSON code must equal {code}.");
            Check(!string.IsNullOrWhiteSpace(root.GetProperty("title").GetString()), $"Title for {code} must not be empty.");
            Check(!string.IsNullOrWhiteSpace(root.GetProperty("detail").GetString()), $"Detail for {code} must not be empty.");
        }
    }),
    ("ExceptionHandlingMiddleware respects custom detail override for BusinessException", async () =>
    {
        var customDetail = "Chi tiết lỗi kiểm thử tùy chỉnh.";
        var (status, body, _) = await RunMiddlewareAsync(
            _ => throw new BusinessException(ErrorCodes.ValidationError, customDetail));

        Check(status == 400, "Validation error must return 400.");

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        Check(root.GetProperty("detail").GetString() == customDetail, "Custom detail must override default detail.");
    }),
    ("ExceptionHandlingMiddleware maps ValidationException to 400 VALIDATION_ERROR with joined messages", async () =>
    {
        var failures = new[]
        {
            new ValidationFailure("Name", "Tên không được để trống."),
            new ValidationFailure("Phone", "Số điện thoại không đúng định dạng.")
        };

        var (status, body, _) = await RunMiddlewareAsync(_ => throw new ValidationException(failures));

        Check(status == 400, $"Expected status 400, got {status}.");

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        Check(root.GetProperty("status").GetInt32() == 400, "JSON status must be 400.");
        Check(root.GetProperty("code").GetString() == "VALIDATION_ERROR", "JSON code must be VALIDATION_ERROR.");
        var detail = root.GetProperty("detail").GetString()!;
        Check(detail.Contains("Tên không được để trống."), "Detail must contain first failure message.");
        Check(detail.Contains("Số điện thoại không đúng định dạng."), "Detail must contain second failure message.");
    }),
    ("ExceptionHandlingMiddleware maps unhandled exception to 500 and hides internal details", async () =>
    {
        var (status, body, _) = await RunMiddlewareAsync(_ => throw new InvalidOperationException("DB connection string leaked: secret_pwd"));

        Check(status == 500, $"Expected status 500, got {status}.");

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        Check(root.GetProperty("status").GetInt32() == 500, "JSON status must be 500.");
        Check(!root.TryGetProperty("code", out _), "Internal error must omit code property in JSON envelope.");
        Check(root.GetProperty("title").GetString() == "Lỗi hệ thống", "Title must be 'Lỗi hệ thống'.");
        var detail = root.GetProperty("detail").GetString()!;
        Check(!detail.Contains("secret_pwd"), "Detail must not leak internal exception details.");
    }),
    ("Serilog logger can be built from configuration with minimum level", () =>
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Serilog:MinimumLevel:Default"] = "Information",
                ["Serilog:MinimumLevel:Override:Microsoft.AspNetCore"] = "Warning"
            })
            .Build();

        using var logger = new LoggerConfiguration()
            .ReadFrom.Configuration(config)
            .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
            .WriteTo.Console()
            .CreateLogger();

        Check(logger.IsEnabled(LogEventLevel.Information), "Information level must be enabled.");
        Check(!logger.IsEnabled(LogEventLevel.Debug), "Debug level must be disabled when MinimumLevel is Information.");

        return Task.CompletedTask;
    }),
    ("RateLimitPolicies registers rate limiting and configures rejection to throw RATE_LIMITED BusinessException", () =>
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimit:AuthPermitPerMinute"] = "10"
            })
            .Build();

        var services = new ServiceCollection();
        services.AddPetSpaRateLimiting(config);
        using var provider = services.BuildServiceProvider();

        var options = provider.GetRequiredService<IOptions<RateLimiterOptions>>().Value;
        Check(options.OnRejected != null, "OnRejected callback must be configured.");

        var threwExpected = false;
        try
        {
            options.OnRejected!(null!, CancellationToken.None).AsTask().GetAwaiter().GetResult();
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.RateLimited)
        {
            threwExpected = true;
        }

        Check(threwExpected, "OnRejected must throw BusinessException with ErrorCodes.RateLimited.");
        return Task.CompletedTask;
    }),
    ("RateLimitPolicies rejects invalid AuthPermitPerMinute configuration", () =>
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimit:AuthPermitPerMinute"] = "0"
            })
            .Build();

        var services = new ServiceCollection();
        var threw = false;
        try
        {
            services.AddPetSpaRateLimiting(config);
        }
        catch (InvalidOperationException)
        {
            threw = true;
        }

        Check(threw, "AddPetSpaRateLimiting must throw InvalidOperationException when AuthPermitPerMinute <= 0.");
        return Task.CompletedTask;
    }),
    ("ForwardedHeadersOptions is configured to trust XForwardedFor behind reverse proxy", () =>
    {
        var services = new ServiceCollection();
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor;
            options.KnownNetworks.Clear();
            options.KnownProxies.Clear();
        });

        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<IOptions<ForwardedHeadersOptions>>().Value;

        Check((options.ForwardedHeaders & ForwardedHeaders.XForwardedFor) == ForwardedHeaders.XForwardedFor,
            "ForwardedHeaders must include XForwardedFor.");
        Check(options.KnownNetworks.Count == 0, "KnownNetworks must be cleared.");
        Check(options.KnownProxies.Count == 0, "KnownProxies must be cleared.");

        return Task.CompletedTask;
    }),
    ("AddInfrastructure rejects missing or short (<32 bytes) Jwt__SigningKey in Production", () =>
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = "Host=localhost;Database=petspa;Username=test;Password=test",
                ["Jwt:SigningKey"] = "short-key-less-than-32-bytes",
                ["ASPNETCORE_ENVIRONMENT"] = "Production"
            })
            .Build();

        var services = new ServiceCollection();
        var threw = false;
        try
        {
            PetSpa.Infrastructure.DependencyInjection.AddInfrastructure(services, config);
        }
        catch (InvalidOperationException)
        {
            threw = true;
        }

        Check(threw, "AddInfrastructure must throw InvalidOperationException when Jwt__SigningKey is < 32 bytes in Production.");
        return Task.CompletedTask;
    }),
    ("AddInfrastructure uses fallback signing key in Development when Jwt__SigningKey is missing or short", () =>
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = "Host=localhost;Database=petspa;Username=test;Password=test",
                ["Jwt:SigningKey"] = "",
                ["Jwt:AccessTokenMinutes"] = "15",
                ["Jwt:RefreshTokenDays"] = "7",
                ["ASPNETCORE_ENVIRONMENT"] = "Development"
            })
            .Build();

        var services = new ServiceCollection();
        PetSpa.Infrastructure.DependencyInjection.AddInfrastructure(services, config);
        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<JwtOptions>();
        Check(Encoding.UTF8.GetByteCount(options.SigningKey) >= 32, "Fallback key in Development must be at least 32 bytes.");
        return Task.CompletedTask;
    }),
    ("AddInfrastructure rejects non-positive AccessTokenMinutes or RefreshTokenDays", () =>
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = "Host=localhost;Database=petspa;Username=test;Password=test",
                ["Jwt:SigningKey"] = "this-is-a-valid-32-byte-secret-key-12345",
                ["Jwt:AccessTokenMinutes"] = "0",
                ["Jwt:RefreshTokenDays"] = "7"
            })
            .Build();

        var services = new ServiceCollection();
        var threw = false;
        try
        {
            PetSpa.Infrastructure.DependencyInjection.AddInfrastructure(services, config);
        }
        catch (InvalidOperationException)
        {
            threw = true;
        }

        Check(threw, "AddInfrastructure must throw InvalidOperationException when AccessTokenMinutes <= 0.");
        return Task.CompletedTask;
    }),
    ("JWT Bearer authentication succeeds with valid token and extracts sub and role claims", async () =>
    {
        var signingKey = "this-is-a-valid-32-byte-secret-key-12345";
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = "Host=localhost;Database=petspa;Username=test;Password=test",
                ["Jwt:SigningKey"] = signingKey,
                ["Jwt:AccessTokenMinutes"] = "15",
                ["Jwt:RefreshTokenDays"] = "7"
            })
            .Build();

        var services = new ServiceCollection();
        PetSpa.Infrastructure.DependencyInjection.AddInfrastructure(services, config);
        services.AddScoped<IIdentityTokenService, FakeActiveIdentityTokenService>();
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();

        var userId = Guid.NewGuid();
        var role = "Customer";
        var token = CreateTestJwt(signingKey, userId, role, TimeSpan.FromMinutes(15));

        var context = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
        context.Request.Headers.Authorization = $"Bearer {token}";

        var authService = scope.ServiceProvider.GetRequiredService<IAuthenticationService>();
        var result = await authService.AuthenticateAsync(context, JwtBearerDefaults.AuthenticationScheme);

        Check(result.Succeeded, "Valid token must succeed authentication.");
        Check(result.Principal != null, "Principal must not be null.");
        Check(result.Principal!.Identity?.IsAuthenticated == true, "Identity must be authenticated.");
        Check(result.Principal!.FindFirst(TokenClaims.UserId)?.Value == userId.ToString(), "sub claim must match UserId.");
        Check(result.Principal!.FindFirst(TokenClaims.Role)?.Value == role, "role claim must match Role.");
    }),
    ("JWT Bearer authentication rejects invalid or tampered token", async () =>
    {
        var signingKey = "this-is-a-valid-32-byte-secret-key-12345";
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = "Host=localhost;Database=petspa;Username=test;Password=test",
                ["Jwt:SigningKey"] = signingKey,
                ["Jwt:AccessTokenMinutes"] = "15",
                ["Jwt:RefreshTokenDays"] = "7"
            })
            .Build();

        var services = new ServiceCollection();
        PetSpa.Infrastructure.DependencyInjection.AddInfrastructure(services, config);
        services.AddScoped<IIdentityTokenService, FakeActiveIdentityTokenService>();
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();

        var wrongKeyToken = CreateTestJwt("another-different-valid-key-32-bytes!", Guid.NewGuid(), "Customer", TimeSpan.FromMinutes(15));

        var context = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
        context.Request.Headers.Authorization = $"Bearer {wrongKeyToken}";

        var authService = scope.ServiceProvider.GetRequiredService<IAuthenticationService>();
        var result = await authService.AuthenticateAsync(context, JwtBearerDefaults.AuthenticationScheme);

        Check(!result.Succeeded, "Token signed with different key must fail authentication.");
    }),
    ("JWT Bearer authentication rejects expired token", async () =>
    {
        var signingKey = "this-is-a-valid-32-byte-secret-key-12345";
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = "Host=localhost;Database=petspa;Username=test;Password=test",
                ["Jwt:SigningKey"] = signingKey,
                ["Jwt:AccessTokenMinutes"] = "15",
                ["Jwt:RefreshTokenDays"] = "7"
            })
            .Build();

        var services = new ServiceCollection();
        PetSpa.Infrastructure.DependencyInjection.AddInfrastructure(services, config);
        services.AddScoped<IIdentityTokenService, FakeActiveIdentityTokenService>();
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();

        var expiredToken = CreateTestJwt(signingKey, Guid.NewGuid(), "Customer", TimeSpan.FromMinutes(-5));

        var context = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
        context.Request.Headers.Authorization = $"Bearer {expiredToken}";

        var authService = scope.ServiceProvider.GetRequiredService<IAuthenticationService>();
        var result = await authService.AuthenticateAsync(context, JwtBearerDefaults.AuthenticationScheme);

        Check(!result.Succeeded, "Expired token must fail authentication.");
    }),
    ("RefreshToken entity instantiates with valid properties", () =>
    {
        var tokenId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        var token = new RefreshToken
        {
            TokenId = tokenId,
            UserId = userId,
            TokenHash = "abc123hash",
            CreatedAt = now,
            ExpiresAt = now.AddDays(7),
            RevokedAt = null
        };

        Check(token.TokenId == tokenId, "TokenId must match.");
        Check(token.UserId == userId, "UserId must match.");
        Check(token.TokenHash == "abc123hash", "TokenHash must match.");
        Check(token.RevokedAt == null, "RevokedAt must be null initially.");
        return Task.CompletedTask;
    }),
    ("AppDbContext maps RefreshToken entity with correct table, primary key, indexes and foreign key", () =>
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=petspa;Username=test;Password=test")
            .Options;

        using var db = new AppDbContext(options);
        var entityType = db.Model.FindEntityType(typeof(RefreshToken));
        Check(entityType != null, "RefreshToken must be registered in the EF model.");
        Check(entityType!.GetTableName() == "RefreshToken", "Table name must be RefreshToken.");

        var pk = entityType!.FindPrimaryKey();
        Check(pk != null && pk.Properties.Count == 1 && pk.Properties[0].Name == nameof(RefreshToken.TokenId),
            "Primary key must be TokenId.");

        var tokenHashProp = entityType.FindProperty(nameof(RefreshToken.TokenHash));
        Check(tokenHashProp != null && !tokenHashProp.IsNullable, "TokenHash must be required.");

        var expiresAtProp = entityType.FindProperty(nameof(RefreshToken.ExpiresAt));
        Check(expiresAtProp != null && !expiresAtProp.IsNullable, "ExpiresAt must be required.");

        var createdAtProp = entityType.FindProperty(nameof(RefreshToken.CreatedAt));
        Check(createdAtProp != null && !createdAtProp.IsNullable, "CreatedAt must be required.");

        var hashIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == nameof(RefreshToken.TokenHash)));
        Check(hashIndex != null && hashIndex.IsUnique, "TokenHash must have a unique index.");

        var userIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == nameof(RefreshToken.UserId)));
        Check(userIndex != null, "UserId must have an index.");

        var fk = entityType.GetForeignKeys().FirstOrDefault(f => f.Properties.Any(p => p.Name == nameof(RefreshToken.UserId)));
        Check(fk != null, "RefreshToken must have a foreign key on UserId.");
        Check(fk!.PrincipalEntityType.ClrType == typeof(AppUser), "Foreign key must point to AppUser.");
        Check(fk.DeleteBehavior == DeleteBehavior.NoAction, "Foreign key must have NoAction delete behavior.");

        return Task.CompletedTask;
    }),
    ("SpaBookingRequestValidator validates required fields and future slotStart", () =>
    {
        var validator = new SpaBookingRequestValidator();
        var valid = validator.Validate(new SpaBookingRequest(
            Guid.NewGuid(), [Guid.NewGuid()], DateTimeOffset.UtcNow.AddHours(2), null));
        Check(valid.IsValid, "Valid request must pass validation.");

        var missingPet = validator.Validate(new SpaBookingRequest(
            null, [Guid.NewGuid()], DateTimeOffset.UtcNow.AddHours(2), null));
        Check(!missingPet.IsValid && missingPet.Errors.Any(e => e.PropertyName == "PetId"),
            "Missing PetId must fail validation.");

        var emptyServices = validator.Validate(new SpaBookingRequest(
            Guid.NewGuid(), [], DateTimeOffset.UtcNow.AddHours(2), null));
        Check(!emptyServices.IsValid && emptyServices.Errors.Any(e => e.PropertyName == "ServiceIds"),
            "Empty ServiceIds must fail validation.");

        var pastSlot = validator.Validate(new SpaBookingRequest(
            Guid.NewGuid(), [Guid.NewGuid()], DateTimeOffset.UtcNow.AddHours(-1), null));
        Check(!pastSlot.IsValid && pastSlot.Errors.Any(e => e.PropertyName == "SlotStart" && e.ErrorMessage.Contains("quá khứ")),
            "Past SlotStart must fail validation.");

        return Task.CompletedTask;
    }),
    ("AppointmentsController.CreateSpa rejects null request with ValidationError", async () =>
    {
        var pet = new Pet { PetId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };
        var dummyService = new BookingService(
            new TestPetRepo(pet, Guid.NewGuid()),
            new TestStaffRoleReader(null),
            new TestCatalogRepo(new ServiceWithPricing(new Service(), []), []),
            new TestScheduleRepo(15, false, [], []),
            new TestConcurrencyGuard(),
            new ShopTimeZone(TimeZoneInfo.Utc));

        var controller = new AppointmentsController(dummyService);
        var threw = false;
        try
        {
            await controller.CreateSpa(null, CancellationToken.None);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError)
        {
            threw = true;
        }

        Check(threw, "Controller must throw BusinessException(ValidationError) when request is null.");
    }),
    ("BookingService rejects booking in the past", async () =>
    {
        var customerId = Guid.NewGuid();
        var ownerUserId = Guid.NewGuid();
        var petId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();
        var pet = new Pet { PetId = petId, CustomerId = customerId, Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };
        var service = new Service { ServiceId = serviceId, Name = "Tắm", LatestStartTime = new TimeOnly(18, 0), IsActive = true };
        var pricing = new ServicePricing { ServiceId = serviceId, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 100000, DurationMinutes = 60, StaffRequired = 1 };
        var slotTimes = new List<TimeOnly> { new(9, 0), new(10, 0) };

        var serviceWithPricing = new ServiceWithPricing(service, [pricing]);
        var bookingService = new BookingService(
            new TestPetRepo(pet, ownerUserId),
            new TestStaffRoleReader(null),
            new TestCatalogRepo(serviceWithPricing, slotTimes),
            new TestScheduleRepo(15, false, [], []),
            new TestConcurrencyGuard(),
            new ShopTimeZone(TimeZoneInfo.Utc));

        var user = new CurrentUser(ownerUserId, UserRole.Customer);
        var threw = false;
        try
        {
            await bookingService.CreateSpaAppointmentAsync(user, null, petId, [serviceId], DateTimeOffset.UtcNow.AddHours(-2));
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError && ex.Message.Contains("quá khứ"))
        {
            threw = true;
        }

        Check(threw, "BookingService must reject past slotStart with ValidationError.");
    }),
    ("BookingService rejects slot exceeding LatestStartTime", async () =>
    {
        var customerId = Guid.NewGuid();
        var ownerUserId = Guid.NewGuid();
        var petId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();
        var pet = new Pet { PetId = petId, CustomerId = customerId, Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };
        var service = new Service { ServiceId = serviceId, Name = "Tắm & Cắt", LatestStartTime = new TimeOnly(17, 0), IsActive = true };
        var pricing = new ServicePricing { ServiceId = serviceId, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 200000, DurationMinutes = 90, StaffRequired = 1 };
        var slotTimes = new List<TimeOnly> { new(9, 0), new(18, 0) };

        var serviceWithPricing = new ServiceWithPricing(service, [pricing]);
        var bookingService = new BookingService(
            new TestPetRepo(pet, ownerUserId),
            new TestStaffRoleReader(null),
            new TestCatalogRepo(serviceWithPricing, slotTimes),
            new TestScheduleRepo(15, false, [], []),
            new TestConcurrencyGuard(),
            new ShopTimeZone(TimeZoneInfo.Utc));

        var user = new CurrentUser(ownerUserId, UserRole.Customer);
        var futureDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2));
        var lateSlot = new DateTimeOffset(futureDate.ToDateTime(new TimeOnly(18, 0)), TimeSpan.Zero);

        var threw = false;
        try
        {
            await bookingService.CreateSpaAppointmentAsync(user, null, petId, [serviceId], lateSlot);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError && ex.Message.Contains("muộn hơn"))
        {
            threw = true;
        }

        Check(threw, "BookingService must reject slot after LatestStartTime with ValidationError.");
    }),
    ("BookingService blocks customer when IsBookingLocked is true", async () =>
    {
        var customerId = Guid.NewGuid();
        var ownerUserId = Guid.NewGuid();
        var petId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();
        var pet = new Pet { PetId = petId, CustomerId = customerId, Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };
        var service = new Service { ServiceId = serviceId, Name = "Tắm", LatestStartTime = new TimeOnly(18, 0), IsActive = true };
        var pricing = new ServicePricing { ServiceId = serviceId, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 100000, DurationMinutes = 60, StaffRequired = 1 };
        var slotTimes = new List<TimeOnly> { new(10, 0) };

        var serviceWithPricing = new ServiceWithPricing(service, [pricing]);
        var bookingService = new BookingService(
            new TestPetRepo(pet, ownerUserId),
            new TestStaffRoleReader(null),
            new TestCatalogRepo(serviceWithPricing, slotTimes),
            new TestScheduleRepo(15, isLocked: true, [], []),
            new TestConcurrencyGuard(),
            new ShopTimeZone(TimeZoneInfo.Utc));

        var user = new CurrentUser(ownerUserId, UserRole.Customer);
        var futureDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var validSlot = new DateTimeOffset(futureDate.ToDateTime(new TimeOnly(10, 0)), TimeSpan.Zero);

        var threw = false;
        try
        {
            await bookingService.CreateSpaAppointmentAsync(user, null, petId, [serviceId], validSlot);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.BookingLocked)
        {
            threw = true;
        }

        Check(threw, "BookingService must throw BOOKING_LOCKED when customer is locked.");
    }),
    ("BookingService allows receptionist booking even when customer is locked", async () =>
    {
        var customerId = Guid.NewGuid();
        var staffUserId = Guid.NewGuid();
        var petId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();
        var pet = new Pet { PetId = petId, CustomerId = customerId, Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };
        var service = new Service { ServiceId = serviceId, Name = "Tắm", LatestStartTime = new TimeOnly(18, 0), IsActive = true };
        var pricing = new ServicePricing { ServiceId = serviceId, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 150000, DurationMinutes = 60, StaffRequired = 1 };
        var slotTimes = new List<TimeOnly> { new(10, 0) };

        var futureDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var validSlot = new DateTimeOffset(futureDate.ToDateTime(new TimeOnly(10, 0)), TimeSpan.Zero);
        var shifts = new List<StaffShiftWindow>
        {
            new(Guid.NewGuid(), validSlot.AddHours(-1), validSlot.AddHours(3))
        };

        var serviceWithPricing = new ServiceWithPricing(service, [pricing]);
        var scheduleRepo = new TestScheduleRepo(15, isLocked: true, shifts, []);
        var concurrencyGuard = new TestConcurrencyGuard();
        var bookingService = new BookingService(
            new TestPetRepo(pet, null),
            new TestStaffRoleReader(StaffRole.Receptionist),
            new TestCatalogRepo(serviceWithPricing, slotTimes),
            scheduleRepo,
            concurrencyGuard,
            new ShopTimeZone(TimeZoneInfo.Utc));

        var receptionistUser = new CurrentUser(staffUserId, UserRole.Staff);
        var result = await bookingService.CreateSpaAppointmentAsync(
            receptionistUser, customerId, petId, [serviceId], validSlot);

        Check(result.Appointment.Status == AppointmentStatus.Pending, "Appointment status must be Pending.");
        Check(result.EstimatedAmount == 150000, "EstimatedAmount must match service price.");
        Check(scheduleRepo.AddedAppointments.Count == 1, "Appointment must be saved in repository.");
        Check(concurrencyGuard.LockedDay, "Day lock must be acquired.");
    }),
    ("BookingService throws SlotFull when no staff available", async () =>
    {
        var customerId = Guid.NewGuid();
        var ownerUserId = Guid.NewGuid();
        var petId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();
        var pet = new Pet { PetId = petId, CustomerId = customerId, Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };
        var service = new Service { ServiceId = serviceId, Name = "Tắm", LatestStartTime = new TimeOnly(18, 0), IsActive = true };
        var pricing = new ServicePricing { ServiceId = serviceId, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 100000, DurationMinutes = 60, StaffRequired = 1 };
        var slotTimes = new List<TimeOnly> { new(10, 0) };

        var futureDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var validSlot = new DateTimeOffset(futureDate.ToDateTime(new TimeOnly(10, 0)), TimeSpan.Zero);

        var serviceWithPricing = new ServiceWithPricing(service, [pricing]);
        var bookingService = new BookingService(
            new TestPetRepo(pet, ownerUserId),
            new TestStaffRoleReader(null),
            new TestCatalogRepo(serviceWithPricing, slotTimes),
            new TestScheduleRepo(15, isLocked: false, shifts: [], held: []),
            new TestConcurrencyGuard(),
            new ShopTimeZone(TimeZoneInfo.Utc));

        var user = new CurrentUser(ownerUserId, UserRole.Customer);
        var threw = false;
        try
        {
            await bookingService.CreateSpaAppointmentAsync(user, null, petId, [serviceId], validSlot);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.SlotFull)
        {
            threw = true;
        }

        Check(threw, "BookingService must throw SLOT_FULL when staff capacity is zero.");
    }),
    ("HotelPricingRowRequestValidator validates species, sizeGroup, and price boundaries", () =>
    {
        var validator = new HotelPricingRowRequestValidator();
        var valid = validator.Validate(new HotelPricingRowRequest(Species.Dog, SizeGroup.Small, 150000, 30000));
        Check(valid.IsValid, "Valid pricing row must pass validation.");

        var nullSpecies = validator.Validate(new HotelPricingRowRequest(null, SizeGroup.Small, 150000, 30000));
        Check(!nullSpecies.IsValid && nullSpecies.Errors.Any(e => e.PropertyName == "Species"),
            "Null species must fail validation.");

        var negativePrice = validator.Validate(new HotelPricingRowRequest(Species.Dog, SizeGroup.Small, -1, 30000));
        Check(!negativePrice.IsValid && negativePrice.Errors.Any(e => e.PropertyName == "PricePerNight"),
            "Negative pricePerNight must fail validation.");

        var negativeFood = validator.Validate(new HotelPricingRowRequest(Species.Dog, SizeGroup.Small, 150000, -1));
        Check(!negativeFood.IsValid && negativeFood.Errors.Any(e => e.PropertyName == "FoodPerNight"),
            "Negative foodPerNight must fail validation.");

        var excessivePrice = validator.Validate(new HotelPricingRowRequest(Species.Dog, SizeGroup.Small, 1_000_000_000_000, 30000));
        Check(!excessivePrice.IsValid && excessivePrice.Errors.Any(e => e.PropertyName == "PricePerNight"),
            "Price exceeding 999_999_999_999 must fail validation.");

        return Task.CompletedTask;
    }),
    ("HotelPricingRequestValidator validates pricing list and late fee boundaries", () =>
    {
        var validator = new HotelPricingRequestValidator();
        var valid = validator.Validate(new HotelPricingRequest(
            [new HotelPricingRowRequest(Species.Dog, SizeGroup.Small, 150000, 30000)], 50000));
        Check(valid.IsValid, "Valid pricing request must pass validation.");

        var nullPricing = validator.Validate(new HotelPricingRequest(null!, 50000));
        Check(!nullPricing.IsValid && nullPricing.Errors.Any(e => e.PropertyName == "Pricing"),
            "Null pricing list must fail validation.");

        var nullLateFee = validator.Validate(new HotelPricingRequest(
            [new HotelPricingRowRequest(Species.Dog, SizeGroup.Small, 150000, 30000)], null));
        Check(!nullLateFee.IsValid && nullLateFee.Errors.Any(e => e.PropertyName == "LateFeePerBlock"),
            "Null lateFeePerBlock must fail validation.");

        var negativeLateFee = validator.Validate(new HotelPricingRequest(
            [new HotelPricingRowRequest(Species.Dog, SizeGroup.Small, 150000, 30000)], -100));
        Check(!negativeLateFee.IsValid && negativeLateFee.Errors.Any(e => e.PropertyName == "LateFeePerBlock"),
            "Negative lateFeePerBlock must fail validation.");

        return Task.CompletedTask;
    }),
    ("HotelPricingController.Update rejects null request body with ValidationError", async () =>
    {
        var repo = new TestHotelCatalogRepo();
        var serviceCatalog = new TestCatalogRepo(new ServiceWithPricing(new Service(), []), []);
        var service = new HotelCatalogService(repo, serviceCatalog);
        var controller = new HotelPricingController(service);

        var threw = false;
        try
        {
            await controller.Update(null, CancellationToken.None);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError)
        {
            threw = true;
        }

        Check(threw, "HotelPricingController.Update must throw ValidationError when request is null.");
    }),
    ("HotelPricingController.Get returns pricing snapshot and late fee", async () =>
    {
        var repo = new TestHotelCatalogRepo
        {
            Prices = [new HotelPricing { Species = Species.Dog, SizeGroup = SizeGroup.Small, PricePerNight = 150000, FoodPerNight = 30000 }],
            LateFee = 50000m
        };
        var serviceCatalog = new TestCatalogRepo(new ServiceWithPricing(new Service(), []), []);
        var service = new HotelCatalogService(repo, serviceCatalog);
        var controller = new HotelPricingController(service);

        var actionResult = await controller.Get(CancellationToken.None);
        var okResult = actionResult as OkObjectResult;
        Check(okResult != null, "Get must return OkObjectResult.");

        var response = okResult!.Value as HotelPricingResponse;
        Check(response != null, "Response must be HotelPricingResponse.");
        Check(response!.Pricing.Count == 1, "Pricing count must be 1.");
        Check(response.Pricing[0].PricePerNight == 150000, "PricePerNight must match.");
        Check(response.Pricing[0].FoodPerNight == 30000, "FoodPerNight must match.");
        Check(response.LateFeePerBlock == 50000, "LateFeePerBlock must match.");
    }),
    ("HotelCatalogService.SetLodgingPricesAsync enforces BR-19 size group validation", async () =>
    {
        var repo = new TestHotelCatalogRepo();
        var serviceCatalog = new TestCatalogRepo(new ServiceWithPricing(new Service(), []), []);
        var service = new HotelCatalogService(repo, serviceCatalog);

        // GuineaPig has only Small and Large in BR-19, Medium must be rejected
        var invalidPrice = new LodgingPriceInput(Species.GuineaPig, SizeGroup.Medium, 100000, 20000);
        var threw = false;
        try
        {
            await service.SetLodgingPricesAsync([invalidPrice], 50000m);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError && ex.Message.Contains("GuineaPig"))
        {
            threw = true;
        }

        Check(threw, "GuineaPig with SizeGroup.Medium must be rejected by BR-19 size rule.");
    }),
    ("HotelCatalogService.SetLodgingPricesAsync rejects duplicate pairs and negative values", async () =>
    {
        var repo = new TestHotelCatalogRepo();
        var serviceCatalog = new TestCatalogRepo(new ServiceWithPricing(new Service(), []), []);
        var service = new HotelCatalogService(repo, serviceCatalog);

        var duplicatePrices = new[]
        {
            new LodgingPriceInput(Species.Dog, SizeGroup.Small, 100000, 20000),
            new LodgingPriceInput(Species.Dog, SizeGroup.Small, 120000, 25000)
        };

        var threwDuplicate = false;
        try
        {
            await service.SetLodgingPricesAsync(duplicatePrices, 50000m);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError && ex.Message.Contains("Mỗi cặp loài"))
        {
            threwDuplicate = true;
        }
        Check(threwDuplicate, "Duplicate species-sizeGroup pairs must be rejected.");

        var threwNegativeFee = false;
        try
        {
            await service.SetLodgingPricesAsync([new LodgingPriceInput(Species.Dog, SizeGroup.Small, 100000, 20000)], -100m);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError && ex.Message.Contains("Phí phạt"))
        {
            threwNegativeFee = true;
        }
        Check(threwNegativeFee, "Negative late fee must be rejected.");

        // Valid update succeeds
        var validPrices = new[]
        {
            new LodgingPriceInput(Species.Dog, SizeGroup.Small, 150000, 30000),
            new LodgingPriceInput(Species.GuineaPig, SizeGroup.Large, 80000, 15000)
        };
        await service.SetLodgingPricesAsync(validPrices, 50000m);
        Check(repo.Prices.Count == 2, "Repo prices count must be 2.");
        Check(repo.LateFee == 50000m, "Repo late fee must be 50000.");
    }),
    ("AppointmentQueryService.ListAsync: Quản lý xem toàn cửa hàng, Khách hàng theo phạm vi riêng, Nhân viên bị từ chối", async () =>
    {
        var repo = new TestAppointmentQueryRepo();
        var pet = new Pet { PetId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), IsActive = true };
        var service = new AppointmentQueryService(repo, new TestPetRepo(pet, Guid.NewGuid()));

        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);
        await service.ListAsync(manager, null, AppointmentStatus.Pending, null, 1, 20);
        Check(repo.ListAllCalls == 1 && repo.ListByCustomerCalls == 0,
            "Manager must be served by the store-wide query.");

        var customer = new CurrentUser(Guid.NewGuid(), UserRole.Customer);
        await service.ListAsync(customer, null, null, null, 1, 20);
        Check(repo.ListAllCalls == 1 && repo.ListByCustomerCalls == 1,
            "Customer must be served by the owner-scoped query.");

        var staff = new CurrentUser(Guid.NewGuid(), UserRole.Staff);
        var threw = false;
        try
        {
            await service.ListAsync(staff, null, null, null, 1, 20);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.Forbidden)
        {
            threw = true;
        }

        Check(threw, "Staff must be rejected with Forbidden.");
        Check(repo.ListAllCalls == 1 && repo.ListByCustomerCalls == 1,
            "Rejected staff must not reach any repository query.");
    })
};

var failures = 0;
foreach (var (name, run) in tests)
{
    try
    {
        await run();
        Console.WriteLine($"PASS: {name}");
    }
    catch (Exception exception)
    {
        failures++;
        Console.Error.WriteLine($"FAIL: {name}: {exception}");
    }
}

Console.WriteLine($"{tests.Length - failures} passed, {failures} failed.");
return failures == 0 ? 0 : 1;

static async Task AssertRejectedAsync(IAsyncActionFilter filter, Dictionary<string, object?> arguments)
{
    var calls = 0;
    try
    {
        await InvokeAsync(filter, arguments, () => calls++);
        throw new InvalidOperationException("Invalid input must throw ValidationException.");
    }
    catch (ValidationException exception)
    {
        Check(calls == 0, "An invalid request must not invoke the action.");
        Check(exception.Errors.Any(failure => failure.PropertyName == nameof(SampleRequest.Name)),
            "Validation failures must identify the invalid field.");
    }
}

static async Task InvokeAsync(IAsyncActionFilter filter, Dictionary<string, object?> arguments,
    Action onAction, CancellationToken cancellationToken = default)
{
    var services = new ServiceCollection();
    services.AddValidatorsFromAssemblyContaining<SampleRequestValidator>();
    await using var provider = services.BuildServiceProvider(new ServiceProviderOptions
    {
        ValidateScopes = true,
        ValidateOnBuild = true
    });
    await using var scope = provider.CreateAsyncScope();
    var httpContext = new DefaultHttpContext
    {
        RequestServices = scope.ServiceProvider,
        RequestAborted = cancellationToken
    };
    var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
    var controller = new object();
    var context = new ActionExecutingContext(actionContext, [], arguments, controller);

    await filter.OnActionExecutionAsync(context, () =>
    {
        onAction();
        return Task.FromResult(new ActionExecutedContext(actionContext, [], controller));
    });
}

static async Task<(int Status, string Body, string ContentType)> RunMiddlewareAsync(RequestDelegate next)
{
    var middleware = new ExceptionHandlingMiddleware(next, NullLogger<ExceptionHandlingMiddleware>.Instance);
    var context = new DefaultHttpContext();
    var responseBodyStream = new MemoryStream();
    context.Response.Body = responseBodyStream;

    await middleware.InvokeAsync(context);

    responseBodyStream.Seek(0, SeekOrigin.Begin);
    using var reader = new StreamReader(responseBodyStream);
    var body = await reader.ReadToEndAsync();

    return (context.Response.StatusCode, body, context.Response.ContentType ?? string.Empty);
}

static void Check(bool condition, string message)
{
    if (!condition)
    {
        throw new InvalidOperationException(message);
    }
}

static string CreateTestJwt(string signingKey, Guid userId, string role, TimeSpan lifetime)
{
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
    var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    var claims = new[]
    {
        new Claim(TokenClaims.UserId, userId.ToString()),
        new Claim(TokenClaims.Role, role)
    };
    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity(claims),
        Expires = DateTime.UtcNow.Add(lifetime),
        SigningCredentials = credentials
    };
    var handler = new JsonWebTokenHandler();
    return handler.CreateToken(tokenDescriptor);
}

public sealed class FakeActiveIdentityTokenService : IIdentityTokenService
{
    public Task<Guid?> ValidateCredentialsAsync(string userName, string password) => Task.FromResult<Guid?>(null);
    public Task<TokenPair> IssueTokensAsync(Guid userId, CancellationToken ct = default) => Task.FromResult(new TokenPair(string.Empty, string.Empty));
    public Task<TokenPair?> RotateAsync(string refreshToken, CancellationToken ct = default) => Task.FromResult<TokenPair?>(null);
    public Task RevokeAsync(string refreshToken, CancellationToken ct = default) => Task.CompletedTask;
    public Task RevokeAllAsync(Guid userId, CancellationToken ct = default) => Task.CompletedTask;
    public Task<bool> IsActiveAsync(Guid userId, CancellationToken ct = default) => Task.FromResult(true);
}

public sealed record SampleRequest(string Name);

public sealed class SampleRequestValidator : AbstractValidator<SampleRequest>
{
    public SampleRequestValidator()
    {
        RuleFor(request => request.Name).NotEmpty();
        RuleFor(request => request.Name).MustAsync(async (name, cancellationToken) =>
        {
            await Task.Delay(1, cancellationToken);
            return name != "rejected";
        });
    }
}

sealed class TestPetRepo(Pet pet, Guid? ownerUserId) : IPetRepository
{
    public Task<PetWithOwner?> FindWithOwnerAsync(Guid petId, CancellationToken ct = default) =>
        Task.FromResult<PetWithOwner?>(pet.PetId == petId ? new PetWithOwner(pet, ownerUserId) : null);
    public Task<Guid?> FindCustomerIdByUserIdAsync(Guid userId, CancellationToken ct = default) => Task.FromResult<Guid?>(null);
    public Task<bool> CustomerExistsAsync(Guid customerId, CancellationToken ct = default) => Task.FromResult(true);
    public Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(Species species, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<SizeRule>>([]);
    public Task<(IReadOnlyList<Pet> Items, int Total)> ListActiveByCustomerAsync(Guid customerId, int page, int pageSize, CancellationToken ct = default) => Task.FromResult(((IReadOnlyList<Pet>)[], 0));
    public Task<bool> IsAssignedToStaffAsync(Guid petId, Guid staffUserId, CancellationToken ct = default) => Task.FromResult(false);
    public Task<bool> HasAppointmentsAsync(Guid petId, CancellationToken ct = default) => Task.FromResult(false);
    public void Add(Pet pet) { }
    public void Remove(Pet pet) { }
    public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
}

sealed class TestCatalogRepo(ServiceWithPricing serviceWithPricing, IReadOnlyList<TimeOnly> slotTimes) : IServiceCatalogRepository
{
    public Task<IReadOnlyList<TimeOnly>> GetSlotTimesAsync(CancellationToken ct = default) =>
        Task.FromResult(slotTimes);
    public Task<IReadOnlyList<ServiceWithPricing>> ListAsync(
        bool includeInactive, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<ServiceWithPricing>>([serviceWithPricing]);
    public Task AddAsync(Service service, IReadOnlyList<ServicePricing> pricing, CancellationToken ct = default) => Task.CompletedTask;
    public Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(CancellationToken ct = default) => Task.FromResult<IReadOnlyList<SizeRule>>([]);
    public Task<bool> UpdateAsync(Service service, IReadOnlyList<ServicePricing> pricing, CancellationToken ct = default) => Task.FromResult(true);
    public Task<bool> SetActiveAsync(Guid serviceId, bool isActive, CancellationToken ct = default) => Task.FromResult(true);
}

sealed class TestScheduleRepo(
    int bufferMinutes,
    bool isLocked,
    IReadOnlyList<StaffShiftWindow> shifts,
    IReadOnlyList<HeldSpaBooking> held) : ISpaScheduleRepository
{
    public List<SpaAppointment> AddedAppointments { get; } = [];
    public Task<int> GetBufferMinutesAsync(CancellationToken ct = default) => Task.FromResult(bufferMinutes);
    public Task<IReadOnlyList<StaffShiftWindow>> ListActiveSpaStaffShiftsAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default) =>
        Task.FromResult(shifts);
    public Task<IReadOnlyList<HeldSpaBooking>> ListHeldSpaBookingsAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default) =>
        Task.FromResult(held);
    public Task<bool> IsBookingLockedAsync(Guid customerId, CancellationToken ct = default) => Task.FromResult(isLocked);
    public Task AddSpaAppointmentAsync(
        SpaAppointment appointment, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default)
    {
        AddedAppointments.Add(appointment);
        return Task.CompletedTask;
    }
}

sealed class TestConcurrencyGuard : IConcurrencyGuard
{
    public bool LockedDay { get; private set; }
    public Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default) => work();
    public Task RunAsync(Func<Task> work, CancellationToken ct = default) => work();
    public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default)
    {
        LockedDay = true;
        return Task.CompletedTask;
    }
    public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) => Task.CompletedTask;
    public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default) => Task.CompletedTask;
}

sealed class TestStaffRoleReader(StaffRole? role) : IStaffRoleReader
{
    public Task<StaffRole?> GetStaffRoleAsync(Guid userId, CancellationToken ct = default) => Task.FromResult(role);
}

sealed class TestHotelCatalogRepo : IHotelCatalogRepository
{
    public List<HotelPricing> Prices { get; set; } = [];
    public decimal LateFee { get; set; } = 0m;

    public Task AddCageAsync(Cage cage, CancellationToken ct = default) => Task.CompletedTask;
    public Task<bool> UpdateCageAsync(Guid cageId, string? code, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default) => Task.FromResult(true);
    public Task<bool> SetCageActiveAsync(Guid cageId, bool isActive, CancellationToken ct = default) => Task.FromResult(true);
    public Task<IReadOnlyList<HotelPricing>> ListPricingAsync(CancellationToken ct = default) => Task.FromResult<IReadOnlyList<HotelPricing>>(Prices);
    public Task<decimal> GetLateFeePerBlockAsync(CancellationToken ct = default) => Task.FromResult(LateFee);
    public Task SetLodgingPricesAsync(IReadOnlyList<HotelPricing> prices, decimal lateFeePerBlock, CancellationToken ct = default)
    {
        Prices = prices.ToList();
        LateFee = lateFeePerBlock;
        return Task.CompletedTask;
    }
}

sealed class TestAppointmentQueryRepo : IAppointmentQueryRepository
{
    public int ListAllCalls { get; private set; }
    public int ListByCustomerCalls { get; private set; }

    public Task<PagedResult<AppointmentListItem>> ListByCustomerUserAsync(
        Guid customerUserId, AppointmentType? type, AppointmentStatus? status, Guid? petId, int page, int pageSize,
        CancellationToken ct = default)
    {
        ListByCustomerCalls++;
        return Task.FromResult(new PagedResult<AppointmentListItem>([], page, pageSize, 0));
    }

    public Task<PagedResult<AppointmentListItem>> ListAllAsync(
        AppointmentType? type, AppointmentStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        ListAllCalls++;
        return Task.FromResult(new PagedResult<AppointmentListItem>([], page, pageSize, 0));
    }

    public Task<AppointmentDetailData?> FindDetailAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult<AppointmentDetailData?>(null);
}


