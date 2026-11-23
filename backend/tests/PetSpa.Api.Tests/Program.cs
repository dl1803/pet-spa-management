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
using PetSpa.Application;
using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Assignment;
using PetSpa.Application.Services;
using PetSpa.Application.Services.Booking;
using PetSpa.Application.Services.Notifications;
using PetSpa.Application.Services.StaffManagement;
using PetSpa.Application.Services.Payments;
using PetSpa.Domain.Enums;
using PetSpa.Infrastructure.Identity;
using PetSpa.Infrastructure.Payments.Vnpay;
using PetSpa.Infrastructure.Storage;
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
            new ShopTimeZone(TimeZoneInfo.Utc),
            NoNotifier());

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
            new ShopTimeZone(TimeZoneInfo.Utc),
            NoNotifier());

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
            new ShopTimeZone(TimeZoneInfo.Utc),
            NoNotifier());

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
            new ShopTimeZone(TimeZoneInfo.Utc),
            NoNotifier());

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
            new ShopTimeZone(TimeZoneInfo.Utc),
            NoNotifier());

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
            new ShopTimeZone(TimeZoneInfo.Utc),
            NoNotifier());

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
    ("AppointmentQueryService.ListAsync: Quản lý xem toàn cửa hàng, Khách hàng theo phạm vi riêng, tài khoản nhân viên không có hồ sơ bị từ chối", async () =>
    {
        var repo = new TestAppointmentQueryRepo();
        var pet = new Pet { PetId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), IsActive = true };
        var service = new AppointmentQueryService(repo, new TestPetRepo(pet, Guid.NewGuid()), new TestStaffRoleReader(null));

        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);
        var targetPetId = Guid.NewGuid();
        await service.ListAsync(manager, null, AppointmentStatus.Pending, targetPetId, 1, 20);
        Check(repo.ListAllCalls == 1 && repo.ListByCustomerCalls == 0 && repo.LastListAllPetId == targetPetId,
            "Manager must be served by the store-wide query with petId passed.");

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

        Check(threw, "Staff without a profile must be rejected with Forbidden.");
        Check(repo.ListAllCalls == 1 && repo.ListByCustomerCalls == 1,
            "Staff without a profile must not reach any repository query.");
    }),
    ("AppointmentQueryService.ListAsync: Lễ tân xem toàn cửa hàng, Nhân viên spa chỉ xem lịch được phân công cho mình", async () =>
    {
        var repo = new TestAppointmentQueryRepo();
        var pet = new Pet { PetId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), IsActive = true };
        var petRepo = new TestPetRepo(pet, Guid.NewGuid());

        var receptionist = new CurrentUser(Guid.NewGuid(), UserRole.Staff);
        var receptionistService = new AppointmentQueryService(repo, petRepo, new TestStaffRoleReader(StaffRole.Receptionist));
        await receptionistService.ListAsync(receptionist, AppointmentType.Spa, AppointmentStatus.Confirmed, null, 1, 20);
        Check(repo.ListAllCalls == 1 && repo.ListBySpaStaffCalls == 0 && repo.ListByCustomerCalls == 0,
            "Receptionist must be served by the store-wide query.");

        var spaStaff = new CurrentUser(Guid.NewGuid(), UserRole.Staff);
        var spaService = new AppointmentQueryService(repo, petRepo, new TestStaffRoleReader(StaffRole.SpaStaff));
        await spaService.ListAsync(spaStaff, null, AppointmentStatus.Confirmed, pet.PetId, 2, 10);
        Check(repo.ListBySpaStaffCalls == 1 && repo.ListAllCalls == 1 && repo.ListByCustomerCalls == 0,
            "Spa staff must be served by the assignment-scoped query only.");
        Check(repo.LastSpaStaffUserId == spaStaff.UserId, "Spa staff query must use the caller's user id.");
        Check(repo.LastSpaStaffPetId == pet.PetId, "Spa staff query must receive the petId filter.");
    }),
    ("AppointmentQueryService.GetAsync: Quản lý, Lễ tân xem lịch bất kỳ; Nhân viên spa chỉ xem lịch được phân công; Khách hàng chỉ xem lịch của mình", async () =>
    {
        var ownerUserId = Guid.NewGuid();
        var appointment = new SpaAppointment { AppointmentId = Guid.NewGuid() };
        var detail = new AppointmentDetailData(appointment, ownerUserId, "Milo", [], []);
        var petRepo = new TestPetRepo(new Pet(), Guid.NewGuid());

        AppointmentQueryService Create(TestAppointmentQueryRepo queryRepo, StaffRole? role) =>
            new(queryRepo, petRepo, new TestStaffRoleReader(role));

        async Task<string?> CodeOfAsync(Func<Task> action)
        {
            try
            {
                await action();
                return null;
            }
            catch (BusinessException ex)
            {
                return ex.Code;
            }
        }

        var repo = new TestAppointmentQueryRepo { DetailResult = detail };
        var staffUser = new CurrentUser(Guid.NewGuid(), UserRole.Staff);

        var managerResult = await Create(repo, null).GetAsync(new CurrentUser(Guid.NewGuid(), UserRole.Manager), appointment.AppointmentId);
        Check(ReferenceEquals(managerResult, detail), "Manager must read any appointment.");

        var receptionistResult = await Create(repo, StaffRole.Receptionist).GetAsync(staffUser, appointment.AppointmentId);
        Check(ReferenceEquals(receptionistResult, detail), "Receptionist must read any appointment.");

        repo.AssignedResult = true;
        var assignedResult = await Create(repo, StaffRole.SpaStaff).GetAsync(staffUser, appointment.AppointmentId);
        Check(ReferenceEquals(assignedResult, detail), "Spa staff must read an appointment assigned to them.");

        repo.AssignedResult = false;
        Check(await CodeOfAsync(() => Create(repo, StaffRole.SpaStaff).GetAsync(staffUser, appointment.AppointmentId)) == ErrorCodes.Forbidden,
            "Spa staff must be forbidden from an appointment not assigned to them.");

        Check(await CodeOfAsync(() => Create(repo, null).GetAsync(staffUser, appointment.AppointmentId)) == ErrorCodes.Forbidden,
            "Staff without a profile must be forbidden.");

        Check(await CodeOfAsync(() => Create(new TestAppointmentQueryRepo(), StaffRole.SpaStaff).GetAsync(staffUser, Guid.NewGuid())) == ErrorCodes.NotFound,
            "Unknown appointment must be reported as not found.");

        var ownerResult = await Create(repo, null).GetAsync(new CurrentUser(ownerUserId, UserRole.Customer), appointment.AppointmentId);
        Check(ReferenceEquals(ownerResult, detail), "Customer must read their own appointment.");

        Check(await CodeOfAsync(() => Create(repo, null).GetAsync(new CurrentUser(Guid.NewGuid(), UserRole.Customer), appointment.AppointmentId)) == ErrorCodes.Forbidden,
            "Customer must be forbidden from another customer's appointment.");
    }),
    ("CheckInService.CheckInSpaAsync: Lễ tân và Quản lý chuyển lịch Đã xác nhận sang Đã tiếp nhận khi còn trong thời gian giữ chỗ và ghi nhận cân nặng", async () =>
    {
        var now = DateTimeOffset.UtcNow;
        var pet = WeightTestCat(2.8m, SizeGroup.Small);
        var petRepo = WeightTestPetRepo(pet);

        var late = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed, now.AddMinutes(-10));
        var lateRepo = new TestAssignmentRepo(late, [], [], new Dictionary<Guid, int>());
        var lateGuard = new TestConcurrencyGuard();
        var receptionistService = new CheckInService(
            lateRepo, lateGuard, new TestStaffRoleReader(StaffRole.Receptionist), petRepo, null!, null!, null!, null!);
        var lateResult = await receptionistService.CheckInSpaAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Staff), late.AppointmentId, 2.8m);
        Check(lateResult.Status == AppointmentStatus.Received && late.Status == AppointmentStatus.Received,
            "Receptionist must move a Confirmed appointment to Received within the hold window.");
        Check(lateResult.WeightCheck.Result == WeightCheckResult.OK && late.ActualWeightKg == 2.8m,
            "The actual weight must be recorded with an OK result.");
        Check(lateGuard.LockedAppointmentId == late.AppointmentId && lateRepo.SaveCalls == 1,
            "The appointment row must be locked and the change saved once.");

        var early = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed, now.AddMinutes(30));
        var managerService = new CheckInService(
            new TestAssignmentRepo(early, [], [], new Dictionary<Guid, int>()),
            new TestConcurrencyGuard(), new TestStaffRoleReader(null), petRepo, null!, null!, null!, null!);
        var earlyResult = await managerService.CheckInSpaAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Manager), early.AppointmentId, 2.8m);
        Check(earlyResult.Status == AppointmentStatus.Received, "Manager must be able to check in, also before the slot start.");

        var extended = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed, now.AddMinutes(-20));
        var extendedRepo = new TestAssignmentRepo(extended, [], [], new Dictionary<Guid, int>()) { HoldMinutes = 30 };
        var extendedService = new CheckInService(
            extendedRepo, new TestConcurrencyGuard(), new TestStaffRoleReader(StaffRole.Receptionist), petRepo, null!, null!, null!, null!);
        var extendedResult = await extendedService.CheckInSpaAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Staff), extended.AppointmentId, 2.8m);
        Check(extendedResult.Status == AppointmentStatus.Received, "The configured Booking.HoldMinutes must be used.");
    }),
    ("CheckInService.CheckInSpaAsync: từ chối vai trò không được phép, lịch không tồn tại, quá thời gian giữ chỗ, sai trạng thái", async () =>
    {
        var now = DateTimeOffset.UtcNow;
        var pet = WeightTestCat(2.8m, SizeGroup.Small);
        const decimal weightKg = 2.8m;

        async Task<string?> CodeOfAsync(Func<Task> action)
        {
            try
            {
                await action();
                return null;
            }
            catch (BusinessException ex)
            {
                return ex.Code;
            }
        }

        CheckInService Create(SpaAppointment? appointment, StaffRole? staffRole, TestConcurrencyGuard? guard = null) =>
            new(
                new TestAssignmentRepo(appointment, [], [], new Dictionary<Guid, int>()),
                guard ?? new TestConcurrencyGuard(),
                new TestStaffRoleReader(staffRole),
                WeightTestPetRepo(pet),
                null!, null!, null!, null!);

        var staffUser = new CurrentUser(Guid.NewGuid(), UserRole.Staff);

        var confirmed = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed, now.AddMinutes(-5));
        var rejectedGuard = new TestConcurrencyGuard();
        Check(await CodeOfAsync(() => Create(confirmed, StaffRole.SpaStaff, rejectedGuard).CheckInSpaAsync(staffUser, confirmed.AppointmentId, weightKg)) == ErrorCodes.Forbidden,
            "Spa staff must not check in.");
        Check(await CodeOfAsync(() => Create(confirmed, null, rejectedGuard).CheckInSpaAsync(staffUser, confirmed.AppointmentId, weightKg)) == ErrorCodes.Forbidden,
            "Staff without a profile must not check in.");
        Check(await CodeOfAsync(() => Create(confirmed, null, rejectedGuard).CheckInSpaAsync(new CurrentUser(Guid.NewGuid(), UserRole.Customer), confirmed.AppointmentId, weightKg)) == ErrorCodes.Forbidden,
            "Customer must not check in.");
        Check(confirmed.Status == AppointmentStatus.Confirmed && confirmed.ActualWeightKg is null && rejectedGuard.RunCalls == 0,
            "A rejected role must not open a transaction or change the appointment.");

        var receptionist = StaffRole.Receptionist;
        Check(await CodeOfAsync(() => Create(null, receptionist).CheckInSpaAsync(staffUser, Guid.NewGuid(), weightKg)) == ErrorCodes.NotFound,
            "Unknown or non-spa appointment must be reported as not found.");

        var expired = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed, now.AddMinutes(-30));
        Check(await CodeOfAsync(() => Create(expired, receptionist).CheckInSpaAsync(staffUser, expired.AppointmentId, weightKg)) == ErrorCodes.InvalidTransition,
            "Check-in after the hold window must be rejected.");
        Check(expired.Status == AppointmentStatus.Confirmed && expired.ActualWeightKg is null,
            "A rejected check-in must keep the status and not record the weight.");

        var tooEarly = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed, now.AddMinutes(120));
        Check(await CodeOfAsync(() => Create(tooEarly, receptionist).CheckInSpaAsync(staffUser, tooEarly.AppointmentId, weightKg)) == ErrorCodes.InvalidTransition,
            "Check-in more than 60 minutes before slot start must be rejected.");
        Check(tooEarly.Status == AppointmentStatus.Confirmed && tooEarly.ActualWeightKg is null,
            "A rejected check-in must keep the status and not record the weight.");

        foreach (var invalidStatus in new[] { AppointmentStatus.Pending, AppointmentStatus.Received, AppointmentStatus.InProgress, AppointmentStatus.Completed, AppointmentStatus.Cancelled })
        {
            var wrongStatus = WeightTestSpa(pet.PetId, SizeGroup.Small, invalidStatus, now.AddMinutes(-5));
            Check(await CodeOfAsync(() => Create(wrongStatus, receptionist).CheckInSpaAsync(staffUser, wrongStatus.AppointmentId, weightKg)) == ErrorCodes.InvalidTransition,
                $"Check-in from {invalidStatus} must be rejected.");
            Check(wrongStatus.Status == invalidStatus && wrongStatus.ActualWeightKg is null,
                $"A rejected check-in must keep the status {invalidStatus} and not record the weight.");
        }
    }),
    ("AddApplication registers CheckInService into DI container", () =>
    {
        var services = new ServiceCollection();
        services.AddApplication();
        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(CheckInService));
        Check(descriptor is not null && descriptor.Lifetime == ServiceLifetime.Scoped,
            "CheckInService must be registered as scoped in AddApplication.");
        return Task.CompletedTask;
    }),
    ("AddApplication registers AppointmentNotifier into DI container", () =>
    {
        var services = new ServiceCollection();
        services.AddApplication();
        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(AppointmentNotifier));
        Check(descriptor is not null && descriptor.Lifetime == ServiceLifetime.Scoped,
            "AppointmentNotifier must be registered as scoped in AddApplication.");
        return Task.CompletedTask;
    }),
    ("AppointmentsController.CheckIn tiếp nhận lịch spa, ghi cân nặng và trả CheckInResponse", async () =>
    {
        var pet = WeightTestCat(2.8m, SizeGroup.Small);
        var spa = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-5));
        var service = new CheckInService(
            new TestAssignmentRepo(spa, [], [], new Dictionary<Guid, int>())
            {
                AmountInput = WeightTestSpaAmountInput(Guid.NewGuid()),
            },
            new TestConcurrencyGuard(), new TestStaffRoleReader(null), WeightTestPetRepo(pet), null!, null!, null!, new TestCostConfirmationRepo());
        var controller = new AppointmentsController(null!, checkInService: service)
        {
            ControllerContext = WeightTestManagerContext(),
        };

        var result = await controller.CheckIn(spa.AppointmentId, new ActualWeightRequest(3.4m), CancellationToken.None) as OkObjectResult;
        Check(result?.Value is CheckInResponse
            {
                Status: AppointmentStatus.Received,
                WeightCheck: { Result: WeightCheckResult.NEEDS_CONFIRMATION, NewSizeGroup: SizeGroup.Medium, OldAmount: 100000L, NewAmount: 150000L, ExpiresAt: not null },
            },
            "CheckIn must return Received with a NEEDS_CONFIRMATION weight check and the new size group.");
        Check(spa.ActualWeightKg == 3.4m && spa.SizeGroup == SizeGroup.Small && pet.WeightKg == 2.8m && pet.SizeGroup == SizeGroup.Small,
            "Only the actual weight may be recorded; the appointment size group and the pet profile must not change.");

        var threw = false;
        try
        {
            await controller.CheckIn(spa.AppointmentId, null, CancellationToken.None);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError)
        {
            threw = true;
        }

        Check(threw, "CheckIn must throw ValidationError when the request body is missing.");

        var threwNullWeight = false;
        try
        {
            await controller.CheckIn(spa.AppointmentId, new ActualWeightRequest(null), CancellationToken.None);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError)
        {
            threwNullWeight = true;
        }

        Check(threwNullWeight, "CheckIn must throw ValidationError when actualWeightKg is null.");
    }),
    ("CheckInService.CheckInSpaAsync: đối chiếu cân nặng OK, NEEDS_CONFIRMATION, PRICE_DECREASED, tính lại chi phí, cập nhật nhóm kích cỡ và hồ sơ thú cưng", async () =>
    {
        var now = DateTimeOffset.UtcNow;
        var staffUser = new CurrentUser(Guid.NewGuid(), UserRole.Staff);

        async Task<(SpaCheckInResult Result, SpaAppointment Appointment, Pet Pet)> RunAsync(
            decimal declaredKg, SizeGroup currentGroup, decimal actualKg)
        {
            var pet = WeightTestCat(declaredKg, currentGroup);
            var appointment = WeightTestSpa(pet.PetId, currentGroup, AppointmentStatus.Confirmed, now.AddMinutes(-5));
            var service = new CheckInService(
                new TestAssignmentRepo(appointment, [], [], new Dictionary<Guid, int>())
                {
                    AmountInput = WeightTestSpaAmountInput(Guid.NewGuid()),
                },
                new TestConcurrencyGuard(), new TestStaffRoleReader(StaffRole.Receptionist), WeightTestPetRepo(pet), null!, null!, null!, new TestCostConfirmationRepo());
            var result = await service.CheckInSpaAsync(staffUser, appointment.AppointmentId, actualKg);
            return (result, appointment, pet);
        }

        var within = await RunAsync(2.8m, SizeGroup.Small, 3.3m);
        Check(within.Result.WeightCheck == new WeightCheckOutcome(WeightCheckResult.OK, null),
            "A heavier weight within the tolerance must be OK without a new size group or amounts.");
        Check(within.Appointment.ActualWeightKg == 3.3m && within.Appointment.SizeGroup == SizeGroup.Small,
            "OK must record the actual weight and keep the appointment size group so that the cost does not change.");
        Check(within.Pet.WeightKg == 3.3m && within.Pet.SizeGroup == SizeGroup.Medium,
            "OK must update the pet profile with the actual weight and its size group.");

        var heavier = await RunAsync(2.8m, SizeGroup.Small, 3.4m);
        Check(heavier.Result.Status == AppointmentStatus.Received
            && (heavier.Result.WeightCheck with { ExpiresAt = null }) == new WeightCheckOutcome(WeightCheckResult.NEEDS_CONFIRMATION, SizeGroup.Medium, 100000m, 150000m),
            "A heavier weight beyond the tolerance and into a bigger group must need confirmation with the recalculated amounts and keep the Received status.");
        Check(heavier.Appointment.ActualWeightKg == 3.4m && heavier.Appointment.SizeGroup == SizeGroup.Small
            && heavier.Pet.WeightKg == 2.8m && heavier.Pet.SizeGroup == SizeGroup.Small,
            "NEEDS_CONFIRMATION must only record the actual weight; the size group and the pet profile change only after the customer confirms.");

        var lighter = await RunAsync(4.0m, SizeGroup.Medium, 2.9m);
        Check(lighter.Result.WeightCheck == new WeightCheckOutcome(WeightCheckResult.PRICE_DECREASED, SizeGroup.Small, 150000m, 100000m),
            "A lighter weight into a smaller group must be PRICE_DECREASED with the new size group and a lower amount.");
        Check(lighter.Appointment.ActualWeightKg == 2.9m && lighter.Appointment.SizeGroup == SizeGroup.Small
            && lighter.Pet.WeightKg == 2.9m && lighter.Pet.SizeGroup == SizeGroup.Small,
            "PRICE_DECREASED must lower the appointment size group and update the pet profile.");
        Check(lighter.Appointment.SlotEnd == lighter.Appointment.SlotStart.AddMinutes(120)
            && lighter.Appointment.BusyUntil == lighter.Appointment.SlotStart.AddMinutes(135)
            && lighter.Appointment.StaffRequired == 1,
            "A size group change must keep the spa slot end, busy-until and staff required.");
    }),
    ("CheckInService.CheckInSpaAsync: thiếu giá của nhóm kích cỡ mới trả VALIDATION_ERROR và không lưu thay đổi", async () =>
    {
        var pet = WeightTestCat(2.8m, SizeGroup.Small);
        var appointment = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-5));
        var serviceId = Guid.NewGuid();
        var repo = new TestAssignmentRepo(appointment, [], [], new Dictionary<Guid, int>())
        {
            AmountInput = new SpaAmountInput(
                Species.Cat,
                [serviceId],
                [new ServicePricing { ServiceId = serviceId, Species = Species.Cat, SizeGroup = SizeGroup.Small, Price = 100000m }]),
        };
        var service = new CheckInService(
            repo, new TestConcurrencyGuard(), new TestStaffRoleReader(StaffRole.Receptionist), WeightTestPetRepo(pet), null!, null!, null!, new TestCostConfirmationRepo());

        string? code = null;
        try
        {
            await service.CheckInSpaAsync(new CurrentUser(Guid.NewGuid(), UserRole.Staff), appointment.AppointmentId, 3.4m);
        }
        catch (BusinessException ex)
        {
            code = ex.Code;
        }

        Check(code == ErrorCodes.ValidationError, "A missing price for the new size group must be reported as ValidationError.");
        Check(repo.SaveCalls == 0 && appointment.ActualWeightKg is null && pet.WeightKg == 2.8m && pet.SizeGroup == SizeGroup.Small,
            "A failed price lookup must not save or record anything.");
    }),
    ("CheckInService.CheckHotelWeightAsync: ghi nhận cân nặng lịch lưu trú Đã xác nhận, tính lại tiền lưu trú, cập nhật nhóm kích cỡ, hồ sơ thú cưng và giữ nguyên trạng thái", async () =>
    {
        var staffUser = new CurrentUser(Guid.NewGuid(), UserRole.Staff);

        (CheckInService Service, HotelAppointment Stay, Pet Pet, TestHotelAssignmentRepo Repo, TestConcurrencyGuard Guard) Create(
            decimal declaredKg, SizeGroup currentGroup)
        {
            var pet = WeightTestCat(declaredKg, currentGroup);
            var stay = WeightTestHotel(pet.PetId, currentGroup, AppointmentStatus.Confirmed);
            var hotelRepo = new TestHotelAssignmentRepo(null, [], []) { Appointment = stay, AppointmentSpecies = Species.Cat };
            var guard = new TestConcurrencyGuard();
            var service = new CheckInService(
                new TestAssignmentRepo(null, [], [], new Dictionary<Guid, int>()),
                guard, new TestStaffRoleReader(StaffRole.Receptionist), WeightTestPetRepo(pet), hotelRepo,
                WeightTestHotelCatalog(), new ShopTimeZone(TimeZoneInfo.Utc), new TestCostConfirmationRepo());
            return (service, stay, pet, hotelRepo, guard);
        }

        static int NightsOf(HotelAppointment stay) =>
            DateOnly.FromDateTime(stay.PlannedCheckOut.UtcDateTime).DayNumber
            - DateOnly.FromDateTime(stay.PlannedCheckIn.UtcDateTime).DayNumber;

        var within = Create(2.8m, SizeGroup.Small);
        var withinResult = await within.Service.CheckHotelWeightAsync(staffUser, within.Stay.AppointmentId, 3.2m);
        Check(withinResult == new WeightCheckOutcome(WeightCheckResult.OK, null), "A weight within the tolerance must be OK.");
        Check(within.Stay.ActualWeightKg == 3.2m && within.Stay.Status == AppointmentStatus.Confirmed
            && within.Stay.SizeGroup == SizeGroup.Small && within.Repo.SaveCalls == 1
            && within.Guard.LockedAppointmentId == within.Stay.AppointmentId,
            "OK must record the weight once under the appointment lock, keep the Confirmed status and the stay size group.");
        Check(within.Pet.WeightKg == 3.2m && within.Pet.SizeGroup == SizeGroup.Medium,
            "OK must update the pet profile with the actual weight and its size group.");

        var heavier = Create(2.8m, SizeGroup.Small);
        var heavierNights = NightsOf(heavier.Stay);
        var heavierResult = await heavier.Service.CheckHotelWeightAsync(staffUser, heavier.Stay.AppointmentId, 3.4m);
        Check((heavierResult with { ExpiresAt = null }) == new WeightCheckOutcome(WeightCheckResult.NEEDS_CONFIRMATION, SizeGroup.Medium, heavierNights * 120000m, heavierNights * 180000m),
            "A weight beyond the tolerance into a bigger group must need confirmation with the recalculated stay amounts.");
        Check(heavier.Stay.ActualWeightKg == 3.4m && heavier.Stay.SizeGroup == SizeGroup.Small
            && heavier.Stay.Status == AppointmentStatus.Confirmed
            && heavier.Pet.WeightKg == 2.8m && heavier.Pet.SizeGroup == SizeGroup.Small,
            "NEEDS_CONFIRMATION must only record the weight; the stay size group, status and pet profile must not change.");

        var lighter = Create(4.0m, SizeGroup.Medium);
        var lighterNights = NightsOf(lighter.Stay);
        var lighterResult = await lighter.Service.CheckHotelWeightAsync(staffUser, lighter.Stay.AppointmentId, 2.9m);
        Check(lighterResult == new WeightCheckOutcome(WeightCheckResult.PRICE_DECREASED, SizeGroup.Small, lighterNights * 180000m, lighterNights * 120000m),
            "A lighter weight into a smaller group must be PRICE_DECREASED with a lower stay amount.");
        Check(lighter.Stay.ActualWeightKg == 2.9m && lighter.Stay.SizeGroup == SizeGroup.Small
            && lighter.Stay.Status == AppointmentStatus.Confirmed
            && lighter.Pet.WeightKg == 2.9m && lighter.Pet.SizeGroup == SizeGroup.Small,
            "PRICE_DECREASED must lower the stay size group and update the pet profile.");
    }),
    ("CheckInService.CheckInSpaAsync: NEEDS_CONFIRMATION tạo một CostConfirmation Pending gắn đúng lịch với cân nặng, nhóm và chi phí đã tính; OK và PRICE_DECREASED không tạo", async () =>
    {
        var now = DateTimeOffset.UtcNow;
        var staffUser = new CurrentUser(Guid.NewGuid(), UserRole.Staff);

        async Task<(SpaCheckInResult Result, SpaAppointment Appointment, TestCostConfirmationRepo Confirmations)> RunAsync(
            decimal declaredKg, SizeGroup currentGroup, decimal actualKg)
        {
            var pet = WeightTestCat(declaredKg, currentGroup);
            var appointment = WeightTestSpa(pet.PetId, currentGroup, AppointmentStatus.Confirmed, now.AddMinutes(-5));
            var confirmations = new TestCostConfirmationRepo { TimeoutMinutes = 45 };
            var service = new CheckInService(
                new TestAssignmentRepo(appointment, [], [], new Dictionary<Guid, int>())
                {
                    AmountInput = WeightTestSpaAmountInput(Guid.NewGuid()),
                },
                new TestConcurrencyGuard(), new TestStaffRoleReader(StaffRole.Receptionist), WeightTestPetRepo(pet), null!, null!, null!, confirmations);
            var result = await service.CheckInSpaAsync(staffUser, appointment.AppointmentId, actualKg);
            return (result, appointment, confirmations);
        }

        var heavier = await RunAsync(2.8m, SizeGroup.Small, 3.4m);
        var created = heavier.Confirmations.Items.Single();
        Check(created.ConfirmationId != Guid.Empty && created.AppointmentId == heavier.Appointment.AppointmentId
            && created.Status == ConfirmationStatus.Pending && created.RespondedAt is null,
            "NEEDS_CONFIRMATION must create one Pending confirmation bound to the appointment.");
        Check(created.ActualWeightKg == 3.4m && created.NewSizeGroup == SizeGroup.Medium
            && created.OldAmount == 100000m && created.NewAmount == 150000m,
            "The confirmation must carry the actual weight, the new size group and the recalculated amounts.");
        Check(created.ExpiresAt == created.CreatedAt.AddMinutes(45) && heavier.Result.WeightCheck.ExpiresAt == created.ExpiresAt,
            "ExpiresAt must be CreatedAt plus the configured timeout and be returned in the weight check.");
        Check(heavier.Result.Status == AppointmentStatus.Received, "The appointment must stay Received.");

        var within = await RunAsync(2.8m, SizeGroup.Small, 3.3m);
        Check(within.Confirmations.Items.Count == 0 && within.Result.WeightCheck.ExpiresAt is null,
            "OK must not create a confirmation.");

        var lighter = await RunAsync(4.0m, SizeGroup.Medium, 2.9m);
        Check(lighter.Confirmations.Items.Count == 0 && lighter.Result.WeightCheck.ExpiresAt is null,
            "PRICE_DECREASED must not create a confirmation.");
    }),
    ("CheckInService.CheckHotelWeightAsync: NEEDS_CONFIRMATION tạo CostConfirmation Pending và từ chối ghi nhận cân nặng lại khi đang chờ xác nhận chi phí", async () =>
    {
        var staffUser = new CurrentUser(Guid.NewGuid(), UserRole.Staff);
        var pet = WeightTestCat(2.8m, SizeGroup.Small);
        var stay = WeightTestHotel(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed);
        var hotelRepo = new TestHotelAssignmentRepo(null, [], []) { Appointment = stay, AppointmentSpecies = Species.Cat };
        var confirmations = new TestCostConfirmationRepo();
        var service = new CheckInService(
            new TestAssignmentRepo(null, [], [], new Dictionary<Guid, int>()),
            new TestConcurrencyGuard(), new TestStaffRoleReader(StaffRole.Receptionist), WeightTestPetRepo(pet), hotelRepo,
            WeightTestHotelCatalog(), new ShopTimeZone(TimeZoneInfo.Utc), confirmations);

        var outcome = await service.CheckHotelWeightAsync(staffUser, stay.AppointmentId, 3.4m);
        var created = confirmations.Items.Single();
        Check(created.AppointmentId == stay.AppointmentId && created.Status == ConfirmationStatus.Pending
            && created.ActualWeightKg == 3.4m && created.NewSizeGroup == SizeGroup.Medium
            && created.OldAmount == outcome.OldAmount && created.NewAmount == outcome.NewAmount
            && created.OldAmount < created.NewAmount,
            "NEEDS_CONFIRMATION must create one Pending confirmation bound to the stay with the recalculated amounts.");
        Check(created.ExpiresAt == created.CreatedAt.AddMinutes(30) && outcome.ExpiresAt == created.ExpiresAt
            && stay.Status == AppointmentStatus.Confirmed,
            "ExpiresAt must use the default timeout and the stay must stay Confirmed.");

        string? code = null;
        try
        {
            await service.CheckHotelWeightAsync(staffUser, stay.AppointmentId, 3.2m);
        }
        catch (BusinessException ex)
        {
            code = ex.Code;
        }

        Check(code == ErrorCodes.CostConfirmationPending, "A weight check on a stay with a Pending confirmation must be rejected.");
        Check(confirmations.Items.Count == 1 && stay.ActualWeightKg == 3.4m && hotelRepo.SaveCalls == 1,
            "A rejected weight check must not create a second confirmation or change the recorded weight.");

        var okPet = WeightTestCat(2.8m, SizeGroup.Small);
        var okStay = WeightTestHotel(okPet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed);
        var okConfirmations = new TestCostConfirmationRepo();
        var okService = new CheckInService(
            new TestAssignmentRepo(null, [], [], new Dictionary<Guid, int>()),
            new TestConcurrencyGuard(), new TestStaffRoleReader(StaffRole.Receptionist), WeightTestPetRepo(okPet),
            new TestHotelAssignmentRepo(null, [], []) { Appointment = okStay, AppointmentSpecies = Species.Cat },
            WeightTestHotelCatalog(), new ShopTimeZone(TimeZoneInfo.Utc), okConfirmations);
        var okOutcome = await okService.CheckHotelWeightAsync(staffUser, okStay.AppointmentId, 3.2m);
        Check(okOutcome.Result == WeightCheckResult.OK && okOutcome.ExpiresAt is null && okConfirmations.Items.Count == 0,
            "OK must not create a confirmation.");
    }),
    ("CheckInService: từ chối khi lịch spa có CostConfirmation Pending hoặc thiếu dung sai hoặc ngày lưu trú không hợp lệ", async () =>
    {
        var staffUser = new CurrentUser(Guid.NewGuid(), UserRole.Staff);
        var now = DateTimeOffset.UtcNow;

        // 1. Spa has pending confirmation -> COST_CONFIRMATION_PENDING
        var pet = WeightTestCat(2.8m, SizeGroup.Small);
        var spa = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed, now.AddMinutes(-5));
        var confirmations = new TestCostConfirmationRepo();
        confirmations.Add(new CostConfirmation
        {
            ConfirmationId = Guid.NewGuid(),
            AppointmentId = spa.AppointmentId,
            Status = ConfirmationStatus.Pending,
        });
        var spaService = new CheckInService(
            new TestAssignmentRepo(spa, [], [], new Dictionary<Guid, int>())
            {
                AmountInput = WeightTestSpaAmountInput(Guid.NewGuid()),
            },
            new TestConcurrencyGuard(), new TestStaffRoleReader(StaffRole.Receptionist), WeightTestPetRepo(pet),
            null!, null!, null!, confirmations);

        string? pendingCode = null;
        try
        {
            await spaService.CheckInSpaAsync(staffUser, spa.AppointmentId, 3.4m);
        }
        catch (BusinessException ex)
        {
            pendingCode = ex.Code;
        }
        Check(pendingCode == ErrorCodes.CostConfirmationPending, "CheckInSpaAsync must reject when a Pending cost confirmation already exists.");

        // 2. Missing weight tolerance -> VALIDATION_ERROR
        var emptyTolerancePetRepo = new TestPetRepo(pet, null)
        {
            SizeRules = [new SizeRule { Species = Species.Cat, Criterion = SizeCriterion.Weight, SmallUpper = 3m, MediumUpper = 5m }],
            Tolerances = [],
        };
        var noToleranceService = new CheckInService(
            new TestAssignmentRepo(spa, [], [], new Dictionary<Guid, int>())
            {
                AmountInput = WeightTestSpaAmountInput(Guid.NewGuid()),
            },
            new TestConcurrencyGuard(), new TestStaffRoleReader(StaffRole.Receptionist), emptyTolerancePetRepo,
            null!, null!, null!, new TestCostConfirmationRepo());

        string? toleranceCode = null;
        try
        {
            await noToleranceService.CheckInSpaAsync(staffUser, spa.AppointmentId, 3.4m);
        }
        catch (BusinessException ex)
        {
            toleranceCode = ex.Code;
        }
        Check(toleranceCode == ErrorCodes.ValidationError, "RecordWeightAsync must throw VALIDATION_ERROR when weight tolerance rule is missing.");

        // 3. Hotel checkOutDate <= checkInDate -> VALIDATION_ERROR
        var invalidDatesStay = WeightTestHotel(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed);
        invalidDatesStay.PlannedCheckIn = now.AddDays(2);
        invalidDatesStay.PlannedCheckOut = now.AddDays(1);
        var invalidHotelRepo = new TestHotelAssignmentRepo(null, [], []) { Appointment = invalidDatesStay, AppointmentSpecies = Species.Cat };
        var dateService = new CheckInService(
            new TestAssignmentRepo(null, [], [], new Dictionary<Guid, int>()),
            new TestConcurrencyGuard(), new TestStaffRoleReader(StaffRole.Receptionist), WeightTestPetRepo(pet),
            invalidHotelRepo, WeightTestHotelCatalog(), new ShopTimeZone(TimeZoneInfo.Utc), new TestCostConfirmationRepo());

        string? dateCode = null;
        try
        {
            await dateService.CheckHotelWeightAsync(staffUser, invalidDatesStay.AppointmentId, 3.4m);
        }
        catch (BusinessException ex)
        {
            dateCode = ex.Code;
        }
        Check(dateCode == ErrorCodes.ValidationError, "QuoteStayAsync must throw VALIDATION_ERROR when checkOutDate <= checkInDate.");
    }),
    ("CheckInService.CheckHotelWeightAsync: từ chối vai trò không được phép, lịch không phải lưu trú, sai trạng thái", async () =>
    {
        var pet = WeightTestCat(2.8m, SizeGroup.Small);
        var staffUser = new CurrentUser(Guid.NewGuid(), UserRole.Staff);

        async Task<string?> CodeOfAsync(Func<Task> action)
        {
            try
            {
                await action();
                return null;
            }
            catch (BusinessException ex)
            {
                return ex.Code;
            }
        }

        CheckInService Create(HotelAppointment? stay, SpaAppointment? spa, StaffRole? staffRole, TestConcurrencyGuard? guard = null) =>
            new(
                new TestAssignmentRepo(spa, [], [], new Dictionary<Guid, int>()),
                guard ?? new TestConcurrencyGuard(),
                new TestStaffRoleReader(staffRole),
                WeightTestPetRepo(pet),
                new TestHotelAssignmentRepo(null, [], []) { Appointment = stay, AppointmentSpecies = Species.Cat }, null!, null!, new TestCostConfirmationRepo());

        var confirmed = WeightTestHotel(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed);
        var rejectedGuard = new TestConcurrencyGuard();
        Check(await CodeOfAsync(() => Create(confirmed, null, StaffRole.SpaStaff, rejectedGuard).CheckHotelWeightAsync(staffUser, confirmed.AppointmentId, 3.2m)) == ErrorCodes.Forbidden,
            "Spa staff must not record the weight.");
        Check(await CodeOfAsync(() => Create(confirmed, null, null, rejectedGuard).CheckHotelWeightAsync(new CurrentUser(Guid.NewGuid(), UserRole.Customer), confirmed.AppointmentId, 3.2m)) == ErrorCodes.Forbidden,
            "Customer must not record the weight.");
        Check(confirmed.ActualWeightKg is null && rejectedGuard.RunCalls == 0,
            "A rejected role must not open a transaction or change the appointment.");

        Check(await CodeOfAsync(() => Create(null, null, StaffRole.Receptionist).CheckHotelWeightAsync(staffUser, Guid.NewGuid(), 3.2m)) == ErrorCodes.NotFound,
            "Unknown appointment must be reported as not found.");

        var spa = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-5));
        Check(await CodeOfAsync(() => Create(null, spa, StaffRole.Receptionist).CheckHotelWeightAsync(staffUser, spa.AppointmentId, 3.2m)) == ErrorCodes.NotFound,
            "A spa appointment must be reported as not found by the hotel weight check.");
        Check(spa.ActualWeightKg is null, "A spa appointment must not get a weight from the hotel weight check.");

        foreach (var invalidStatus in new[] { AppointmentStatus.Pending, AppointmentStatus.InStay, AppointmentStatus.Completed, AppointmentStatus.Cancelled })
        {
            var wrongStatus = WeightTestHotel(pet.PetId, SizeGroup.Small, invalidStatus);
            Check(await CodeOfAsync(() => Create(wrongStatus, null, StaffRole.Receptionist).CheckHotelWeightAsync(staffUser, wrongStatus.AppointmentId, 3.2m)) == ErrorCodes.InvalidTransition,
                $"Weight check from {invalidStatus} must be rejected.");
            Check(wrongStatus.ActualWeightKg is null, $"A rejected weight check on {invalidStatus} must not record the weight.");
        }
    }),
    ("AppointmentsController.WeightCheck ghi nhận cân nặng lịch lưu trú và trả WeightCheckResponse", async () =>
    {
        var pet = WeightTestCat(2.8m, SizeGroup.Small);
        var stay = WeightTestHotel(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed);
        var service = new CheckInService(
            new TestAssignmentRepo(null, [], [], new Dictionary<Guid, int>()),
            new TestConcurrencyGuard(), new TestStaffRoleReader(null), WeightTestPetRepo(pet),
            new TestHotelAssignmentRepo(null, [], []) { Appointment = stay, AppointmentSpecies = Species.Cat }, null!, null!, new TestCostConfirmationRepo());
        var controller = new AppointmentsController(null!, checkInService: service)
        {
            ControllerContext = WeightTestManagerContext(),
        };

        var result = await controller.WeightCheck(stay.AppointmentId, new ActualWeightRequest(3.2m), CancellationToken.None) as OkObjectResult;
        Check(result?.Value is WeightCheckResponse { WeightCheck: { Result: WeightCheckResult.OK, NewSizeGroup: null } },
            "WeightCheck must return Ok with an OK weight check and no new size group.");
        Check(stay.ActualWeightKg == 3.2m && stay.Status == AppointmentStatus.Confirmed,
            "WeightCheck must record the weight and keep the Confirmed status.");

        var threw = false;
        try
        {
            await controller.WeightCheck(stay.AppointmentId, null, CancellationToken.None);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError)
        {
            threw = true;
        }

        Check(threw, "WeightCheck must throw ValidationError when the request body is missing.");

        var threwNullWeight = false;
        try
        {
            await controller.WeightCheck(stay.AppointmentId, new ActualWeightRequest(null), CancellationToken.None);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError)
        {
            threwNullWeight = true;
        }

        Check(threwNullWeight, "WeightCheck must throw ValidationError when actualWeightKg is null.");
    }),
    ("ActualWeightRequestValidator chỉ chấp nhận cân nặng lớn hơn 0, nhỏ hơn 1000 và tối đa 2 chữ số thập phân", () =>
    {
        var validator = new ActualWeightRequestValidator();

        Check(validator.Validate(new ActualWeightRequest(11.2m)).IsValid, "11.2 must be valid.");
        Check(validator.Validate(new ActualWeightRequest(999.99m)).IsValid, "999.99 must be valid.");
        Check(!validator.Validate(new ActualWeightRequest(null)).IsValid, "A missing weight must fail.");
        Check(!validator.Validate(new ActualWeightRequest(0m)).IsValid, "Zero must fail.");
        Check(!validator.Validate(new ActualWeightRequest(-1m)).IsValid, "A negative weight must fail.");
        Check(!validator.Validate(new ActualWeightRequest(1.234m)).IsValid, "Three decimal places must fail.");
        Check(!validator.Validate(new ActualWeightRequest(1000m)).IsValid, "1000 must fail.");

        return Task.CompletedTask;
    }),
    ("VnpayPaymentRequestBuilder builds the unsigned sandbox payload from the transaction", () =>
    {
        var builder = new VnpayPaymentRequestBuilder(ValidVnpayOptions());
        var payload = builder.Build(VnpayTransaction(), "203.0.113.7");

        var expected = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Amount"] = "15000000",
            ["vnp_Command"] = "pay",
            ["vnp_CreateDate"] = "20261112170000",
            ["vnp_CurrCode"] = "VND",
            ["vnp_ExpireDate"] = "20261112171500",
            ["vnp_IpAddr"] = "203.0.113.7",
            ["vnp_Locale"] = "vn",
            ["vnp_OrderInfo"] = "Thanh toan lich hen ABC123def456",
            ["vnp_OrderType"] = "other",
            ["vnp_ReturnUrl"] = "https://example.test/payments/vnpay/return",
            ["vnp_TmnCode"] = "TESTCODE",
            ["vnp_TxnRef"] = "ABC123def456",
            ["vnp_Version"] = "2.1.0",
        };

        Check(payload.Keys.SequenceEqual(expected.Keys), "Payload keys must match the VNPAY parameter set in ascending order.");
        Check(payload.Values.SequenceEqual(expected.Values), "Payload values must match the transaction data and fixed VNPAY constants.");
        Check(!payload.ContainsKey("vnp_SecureHash") && !payload.ContainsKey("vnp_SecureHashType") && !payload.ContainsKey("vnp_BankCode"),
            "Payload must not contain signature or bank code parameters.");
        return Task.CompletedTask;
    }),
    ("VnpayPaymentRequestBuilder takes the amount from RequestedAmount and multiplies it by 100", () =>
    {
        var builder = new VnpayPaymentRequestBuilder(ValidVnpayOptions());

        var small = builder.Build(VnpayTransaction(amount: 1m), "203.0.113.7");
        Check(small["vnp_Amount"] == "100", "1 VND must be sent as 100.");

        var max = builder.Build(VnpayTransaction(amount: 9_999_999_999m), "203.0.113.7");
        Check(max["vnp_Amount"] == "999999999900", "Largest accepted amount must be sent as 999999999900.");

        foreach (var invalid in new[] { 0m, -1m, 100.5m, 10_000_000_000m })
        {
            AssertThrows<ArgumentOutOfRangeException>(
                () => builder.Build(VnpayTransaction(amount: invalid), "203.0.113.7"),
                $"RequestedAmount {invalid} must be rejected.");
        }

        return Task.CompletedTask;
    }),
    ("VnpayPaymentRequestBuilder rejects non-VNPAY transactions and invalid TxnRef", () =>
    {
        var builder = new VnpayPaymentRequestBuilder(ValidVnpayOptions());

        AssertThrows<ArgumentException>(
            () => builder.Build(VnpayTransaction(gateway: PaymentGateway.MoMo), "203.0.113.7"),
            "A MoMo transaction must be rejected.");

        foreach (var invalid in new[] { "", "ABC 123", "ABC-123", "Mã1", new string('A', 65) })
        {
            AssertThrows<ArgumentException>(
                () => builder.Build(VnpayTransaction(txnRef: invalid), "203.0.113.7"),
                $"TxnRef '{invalid}' must be rejected.");
        }

        var longest = builder.Build(VnpayTransaction(txnRef: new string('A', 64)), "203.0.113.7");
        Check(longest["vnp_TxnRef"].Length == 64, "A 64-character TxnRef must be accepted.");
        return Task.CompletedTask;
    }),
    ("VnpayPaymentRequestBuilder validates the customer IP address", () =>
    {
        var builder = new VnpayPaymentRequestBuilder(ValidVnpayOptions());

        foreach (var invalid in new[] { "", "not-an-ip", "999.1.1.1" })
        {
            AssertThrows<ArgumentException>(
                () => builder.Build(VnpayTransaction(), invalid),
                $"IP '{invalid}' must be rejected.");
        }

        var ipv6 = builder.Build(VnpayTransaction(), "2001:db8::1");
        Check(ipv6["vnp_IpAddr"] == "2001:db8::1", "A valid IPv6 address must be passed through unchanged.");
        return Task.CompletedTask;
    }),
    ("VnpayPaymentRequestBuilder rejects invalid configuration", () =>
    {
        foreach (var tmnCode in new[] { "", "SHORT", "TESTCOD!", "TOOLONGCODE" })
        {
            AssertThrows<InvalidOperationException>(
                () => new VnpayPaymentRequestBuilder(new VnpayOptions
                {
                    TmnCode = tmnCode,
                    ReturnUrl = "https://example.test/payments/vnpay/return",
                }),
                $"TmnCode '{tmnCode}' must be rejected.");
        }

        foreach (var returnUrl in new[] { "", "/payments/vnpay/return", "ftp://example.test/return", "http://a", "https://example.test/" + new string('a', 250) })
        {
            AssertThrows<InvalidOperationException>(
                () => new VnpayPaymentRequestBuilder(new VnpayOptions { TmnCode = "TESTCODE", ReturnUrl = returnUrl }),
                $"ReturnUrl '{returnUrl}' must be rejected.");
        }

        return Task.CompletedTask;
    }),
    ("AssignmentService.GetSpaSuggestionsAsync excludes out-of-shift and conflicting staff and ranks by recent assignments", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var busyUntil = slotStart.AddMinutes(135);
        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(120),
            BusyUntil = busyUntil,
            StaffRequired = 1,
        };
        var an = new SpaStaffCandidate(Guid.NewGuid(), "An");
        var binh = new SpaStaffCandidate(Guid.NewGuid(), "Binh");
        var chi = new SpaStaffCandidate(Guid.NewGuid(), "Chi");
        var dung = new SpaStaffCandidate(Guid.NewGuid(), "Dung");

        var shifts = new[] { an, binh, chi }
            .Select(s => new StaffShiftWindow(s.StaffId, slotStart.AddHours(-1), busyUntil.AddHours(1)))
            .ToList();
        var busy = new[]
        {
            new StaffBusyWindow(chi.StaffId, slotStart.AddMinutes(30), busyUntil.AddMinutes(30)),
        };
        var recentCounts = new Dictionary<Guid, int>
        {
            [an.StaffId] = 3,
            [binh.StaffId] = 1,
        };

        var service = new AssignmentService(
            new TestAssignmentRepo(appointment, [an, binh, chi, dung], busy, recentCounts),
            new TestScheduleRepo(15, false, shifts, []),
            new TestConcurrencyGuard(),
            NoNotifier());

        var result = await service.GetSpaSuggestionsAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Manager), appointment.AppointmentId);

        Check(result.StaffRequired == 1, "StaffRequired must come from the appointment.");
        Check(result.Suggested.Select(s => s.FullName).SequenceEqual(new[] { "Binh" }),
            "Suggested must be the eligible staff with the fewest recent assignments.");
        Check(result.Suggested[0].RecentAssignmentCount == 1, "Suggested must carry the recent assignment count.");
        Check(result.Alternatives.Select(s => s.FullName).SequenceEqual(new[] { "An" }),
            "Alternatives must hold the remaining eligible staff; Chi (conflict) and Dung (no shift) must be excluded.");
    }),
    ("AssignmentService.GetSpaSuggestionsAsync rejects non-manager, unknown appointment and non-pending appointment", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Confirmed,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(120),
            BusyUntil = slotStart.AddMinutes(135),
            StaffRequired = 1,
        };
        var service = new AssignmentService(
            new TestAssignmentRepo(appointment, [], [], new Dictionary<Guid, int>()),
            new TestScheduleRepo(15, false, [], []),
            new TestConcurrencyGuard(),
            NoNotifier());
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);

        async Task<string?> CodeOfAsync(Func<Task> action)
        {
            try
            {
                await action();
                return null;
            }
            catch (BusinessException ex)
            {
                return ex.Code;
            }
        }

        var forCustomer = await CodeOfAsync(() => service.GetSpaSuggestionsAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Customer), appointment.AppointmentId));
        var forUnknown = await CodeOfAsync(() => service.GetSpaSuggestionsAsync(manager, Guid.NewGuid()));
        var forConfirmed = await CodeOfAsync(() => service.GetSpaSuggestionsAsync(manager, appointment.AppointmentId));

        Check(forCustomer == ErrorCodes.Forbidden, "A non-manager must be rejected with Forbidden.");
        Check(forUnknown == ErrorCodes.NotFound, "An unknown appointment must be rejected with NotFound.");
        Check(forConfirmed == ErrorCodes.InvalidTransition, "A non-pending appointment must be rejected with InvalidTransition.");
    }),
    ("AssignmentService.AssignSpaStaffAsync saves one holding row per chosen staff for a manager", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var busyUntil = slotStart.AddMinutes(135);
        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(120),
            BusyUntil = busyUntil,
            StaffRequired = 2,
        };
        var an = new SpaStaffCandidate(Guid.NewGuid(), "An");
        var binh = new SpaStaffCandidate(Guid.NewGuid(), "Binh");
        var shifts = new[] { an, binh }
            .Select(s => new StaffShiftWindow(s.StaffId, slotStart.AddHours(-1), busyUntil.AddHours(1)))
            .ToList();
        var repo = new TestAssignmentRepo(appointment, [an, binh], [], new Dictionary<Guid, int>());
        var guard = new TestConcurrencyGuard();
        var service = new AssignmentService(repo, new TestScheduleRepo(15, false, shifts, []), guard, NoNotifier());

        await service.AssignSpaStaffAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Manager),
            appointment.AppointmentId,
            [an.StaffId, binh.StaffId],
            false);

        Check(guard.LockedAppointmentId == appointment.AppointmentId, "The appointment must be locked with LockAppointmentAsync.");
        Check(repo.LastExcludeAppointmentId == appointment.AppointmentId, "The appointment must be excluded from conflict check.");
        Check(repo.Added.Count == 2, "One holding row must be saved for each chosen staff.");
        Check(repo.Added.Select(r => r.StaffId).OrderBy(id => id)
                .SequenceEqual(new[] { an.StaffId, binh.StaffId }.OrderBy(id => id)),
            "The saved rows must belong to the chosen staff.");
        Check(repo.Added.All(r => r.AppointmentId == appointment.AppointmentId
                && r.IsHolding
                && r.BusyFrom == slotStart
                && r.BusyUntil == busyUntil),
            "Each row must hold the appointment's SlotStart and BusyUntil.");

        // Idempotency / Re-assignment: assigning again replaces the staff without self-conflict or ghost holds
        var cuong = new SpaStaffCandidate(Guid.NewGuid(), "Cuong");
        var shiftsWithCuong = new[] { an, cuong }
            .Select(s => new StaffShiftWindow(s.StaffId, slotStart.AddHours(-1), busyUntil.AddHours(1)))
            .ToList();
        var repoReassign = new TestAssignmentRepo(appointment, [an, cuong], [], new Dictionary<Guid, int>());
        repoReassign.Added.AddRange(repo.Added); // simulate existing assignments in DB
        var serviceReassign = new AssignmentService(repoReassign, new TestScheduleRepo(15, false, shiftsWithCuong, []), guard, NoNotifier());

        await serviceReassign.AssignSpaStaffAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Manager),
            appointment.AppointmentId,
            [an.StaffId, cuong.StaffId],
            false);

        Check(repoReassign.Added.Count == 2, "Re-assigning must maintain exactly 2 staff rows without ghost holds.");
        Check(repoReassign.Added.Any(r => r.StaffId == cuong.StaffId), "Re-assigning must include newly chosen staff.");
        Check(!repoReassign.Added.Any(r => r.StaffId == binh.StaffId), "Old replaced staff must no longer be held.");
    }),
    ("AssignmentService.AssignSpaStaffAsync rejects non-manager, wrong state, wrong staff count, inactive staff, conflict and out-of-shift staff without saving", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var busyUntil = slotStart.AddMinutes(135);
        var an = new SpaStaffCandidate(Guid.NewGuid(), "An");
        var binh = new SpaStaffCandidate(Guid.NewGuid(), "Binh");
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);
        var coveringShifts = new[] { an, binh }
            .Select(s => new StaffShiftWindow(s.StaffId, slotStart.AddHours(-1), busyUntil.AddHours(1)))
            .ToList();

        SpaAppointment SpaWith(AppointmentStatus status, short staffRequired) => new()
        {
            AppointmentId = Guid.NewGuid(),
            Status = status,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(120),
            BusyUntil = busyUntil,
            StaffRequired = staffRequired,
        };

        (AssignmentService Service, TestAssignmentRepo Repo) Make(
            SpaAppointment target,
            IReadOnlyList<StaffBusyWindow> busy,
            IReadOnlyList<StaffShiftWindow> shifts)
        {
            var repo = new TestAssignmentRepo(target, [an, binh], busy, new Dictionary<Guid, int>());
            return (new AssignmentService(repo, new TestScheduleRepo(15, false, shifts, []), new TestConcurrencyGuard(), NoNotifier()), repo);
        }

        async Task<BusinessException?> ThrownAsync(Func<Task> action)
        {
            try
            {
                await action();
                return null;
            }
            catch (BusinessException ex)
            {
                return ex;
            }
        }

        var pending = SpaWith(AppointmentStatus.Pending, 1);

        var forCustomer = Make(pending, [], coveringShifts);
        var customerError = await ThrownAsync(() => forCustomer.Service.AssignSpaStaffAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Customer), pending.AppointmentId, [an.StaffId], false));

        var forNull = Make(pending, [], coveringShifts);
        var nullError = await ThrownAsync(() => forNull.Service.AssignSpaStaffAsync(
            manager, pending.AppointmentId, null, false));

        var forEmpty = Make(pending, [], coveringShifts);
        var emptyError = await ThrownAsync(() => forEmpty.Service.AssignSpaStaffAsync(
            manager, pending.AppointmentId, [], false));

        var forUnknown = Make(pending, [], coveringShifts);
        var unknownError = await ThrownAsync(() => forUnknown.Service.AssignSpaStaffAsync(
            manager, Guid.NewGuid(), [an.StaffId], false));

        var confirmed = SpaWith(AppointmentStatus.Confirmed, 1);
        var forConfirmed = Make(confirmed, [], coveringShifts);
        var confirmedError = await ThrownAsync(() => forConfirmed.Service.AssignSpaStaffAsync(
            manager, confirmed.AppointmentId, [an.StaffId], false));

        var forWrongCount = Make(pending, [], coveringShifts);
        var wrongCountError = await ThrownAsync(() => forWrongCount.Service.AssignSpaStaffAsync(
            manager, pending.AppointmentId, [an.StaffId, binh.StaffId], false));

        var forInactive = Make(pending, [], coveringShifts);
        var inactiveError = await ThrownAsync(() => forInactive.Service.AssignSpaStaffAsync(
            manager, pending.AppointmentId, [Guid.NewGuid()], false));

        var busyAn = new[] { new StaffBusyWindow(an.StaffId, slotStart.AddMinutes(30), busyUntil.AddMinutes(30)) };
        var forConflict = Make(pending, busyAn, coveringShifts);
        var conflictError = await ThrownAsync(() => forConflict.Service.AssignSpaStaffAsync(
            manager, pending.AppointmentId, [an.StaffId], false));

        var onlyBinhShift = new[] { new StaffShiftWindow(binh.StaffId, slotStart.AddHours(-1), busyUntil.AddHours(1)) };
        var forOutOfShift = Make(pending, [], onlyBinhShift);
        var outOfShiftError = await ThrownAsync(() => forOutOfShift.Service.AssignSpaStaffAsync(
            manager, pending.AppointmentId, [an.StaffId], false));

        var forConfirmedAgain = Make(pending, [], onlyBinhShift);
        await forConfirmedAgain.Service.AssignSpaStaffAsync(manager, pending.AppointmentId, [an.StaffId], true);

        Check(customerError?.Code == ErrorCodes.Forbidden, "A non-manager must be rejected with Forbidden.");
        Check(nullError?.Code == ErrorCodes.ValidationError, "A null staff collection must be rejected with ValidationError.");
        Check(emptyError?.Code == ErrorCodes.ValidationError, "An empty staff collection must be rejected with ValidationError.");
        Check(unknownError?.Code == ErrorCodes.NotFound, "An unknown appointment must be rejected with NotFound.");
        Check(confirmedError?.Code == ErrorCodes.InvalidTransition, "A non-pending appointment must be rejected with InvalidTransition.");
        Check(wrongCountError?.Code == ErrorCodes.StaffCountMismatch, "A wrong staff count must be rejected with StaffCountMismatch.");
        Check(inactiveError?.Code == ErrorCodes.ValidationError, "A staff that is not an active spa staff must be rejected with ValidationError.");
        Check(conflictError?.Code == ErrorCodes.StaffConflict, "A staff with an overlapping holding must be rejected with StaffConflict.");
        Check(outOfShiftError?.Code == ErrorCodes.StaffOutOfShift, "A staff without a covering shift must be rejected with StaffOutOfShift.");
        Check(outOfShiftError!.Detail!.Contains("An"), "The out-of-shift error must name the staff.");
        Check(forCustomer.Repo.Added.Count == 0
                && forNull.Repo.Added.Count == 0
                && forEmpty.Repo.Added.Count == 0
                && forUnknown.Repo.Added.Count == 0
                && forConfirmed.Repo.Added.Count == 0
                && forWrongCount.Repo.Added.Count == 0
                && forInactive.Repo.Added.Count == 0
                && forConflict.Repo.Added.Count == 0
                && forOutOfShift.Repo.Added.Count == 0,
            "Rejected requests must not save any assignment.");
        Check(forConfirmedAgain.Repo.Added.Count == 1,
            "An out-of-shift staff must be saved when the manager confirms again with confirmOutOfShift = true.");
    }),
    ("AssignmentService.AssignSpaStaffAsync runs inside the concurrency guard and locks the appointment row", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var busyUntil = slotStart.AddMinutes(135);
        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(120),
            BusyUntil = busyUntil,
            StaffRequired = 1,
        };
        var an = new SpaStaffCandidate(Guid.NewGuid(), "An");
        var shifts = new[] { new StaffShiftWindow(an.StaffId, slotStart.AddHours(-1), busyUntil.AddHours(1)) };
        var guard = new TestConcurrencyGuard();
        var service = new AssignmentService(
            new TestAssignmentRepo(appointment, [an], [], new Dictionary<Guid, int>()),
            new TestScheduleRepo(15, false, shifts, []),
            guard,
            NoNotifier());

        await service.AssignSpaStaffAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Manager), appointment.AppointmentId, [an.StaffId], false);

        Check(guard.RunCalls == 1, "Assigning staff must run inside exactly one concurrency guard transaction.");
        Check(guard.LockedAppointmentId == appointment.AppointmentId, "Assigning staff must lock the appointment row.");
    }),
    ("AssignmentService.ConfirmSpaAsync confirms a pending appointment that has full staff, recalculates the amount by the appointment size group and saves once inside the concurrency guard", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var bath = Guid.NewGuid();
        var trim = Guid.NewGuid();
        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Large,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(120),
            BusyUntil = slotStart.AddMinutes(135),
            StaffRequired = 1,
        };
        var repo = new TestAssignmentRepo(appointment, [], [], new Dictionary<Guid, int>())
        {
            AmountInput = new SpaAmountInput(
                Species.Dog,
                [bath, trim],
                [
                    new ServicePricing { ServiceId = bath, Species = Species.Dog, SizeGroup = SizeGroup.Medium, Price = 150_000m },
                    new ServicePricing { ServiceId = trim, Species = Species.Dog, SizeGroup = SizeGroup.Medium, Price = 120_000m },
                    new ServicePricing { ServiceId = bath, Species = Species.Dog, SizeGroup = SizeGroup.Large, Price = 200_000m },
                    new ServicePricing { ServiceId = trim, Species = Species.Dog, SizeGroup = SizeGroup.Large, Price = 160_000m },
                ]),
        };
        repo.Added.Add(new AppointmentStaff
        {
            AppointmentId = appointment.AppointmentId,
            StaffId = Guid.NewGuid(),
            BusyFrom = slotStart,
            BusyUntil = appointment.BusyUntil,
            IsHolding = true,
            AssignedAt = DateTimeOffset.UtcNow,
        });
        var guard = new TestConcurrencyGuard();
        var service = new AssignmentService(repo, new TestScheduleRepo(15, false, [], []), guard, NoNotifier());

        var result = await service.ConfirmSpaAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Manager), appointment.AppointmentId);

        Check(result.Status == AppointmentStatus.Confirmed, "The returned status must be Confirmed.");
        Check(appointment.Status == AppointmentStatus.Confirmed, "The appointment must be moved to Confirmed.");
        Check(result.Amount == 360_000m, "The amount must be the sum of the services' prices for the appointment's size group.");
        Check(guard.RunCalls == 1, "Confirming must run inside exactly one concurrency guard transaction.");
        Check(guard.LockedAppointmentId == appointment.AppointmentId, "Confirming must lock the appointment row.");
        Check(repo.SaveCalls == 1, "Confirming must save exactly once.");
    }),
    ("AssignmentService.ConfirmSpaAsync rejects non-manager, unknown appointment, wrong state and wrong assigned staff count without saving", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);

        SpaAppointment SpaWith(AppointmentStatus status, short staffRequired) => new()
        {
            AppointmentId = Guid.NewGuid(),
            Status = status,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(120),
            BusyUntil = slotStart.AddMinutes(135),
            StaffRequired = staffRequired,
        };

        (AssignmentService Service, TestAssignmentRepo Repo) Make(SpaAppointment target, int assignedHolding)
        {
            var repo = new TestAssignmentRepo(target, [], [], new Dictionary<Guid, int>());
            for (var i = 0; i < assignedHolding; i++)
            {
                repo.Added.Add(new AppointmentStaff
                {
                    AppointmentId = target.AppointmentId,
                    StaffId = Guid.NewGuid(),
                    BusyFrom = target.SlotStart,
                    BusyUntil = target.BusyUntil,
                    IsHolding = true,
                    AssignedAt = DateTimeOffset.UtcNow,
                });
            }

            return (new AssignmentService(repo, new TestScheduleRepo(15, false, [], []), new TestConcurrencyGuard(), NoNotifier()), repo);
        }

        async Task<BusinessException?> ThrownAsync(Func<Task> action)
        {
            try
            {
                await action();
                return null;
            }
            catch (BusinessException ex)
            {
                return ex;
            }
        }

        var pending = SpaWith(AppointmentStatus.Pending, 1);
        var forCustomer = Make(pending, 1);
        var customerError = await ThrownAsync(() => forCustomer.Service.ConfirmSpaAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Customer), pending.AppointmentId));

        var forUnknown = Make(pending, 1);
        var unknownError = await ThrownAsync(() => forUnknown.Service.ConfirmSpaAsync(manager, Guid.NewGuid()));

        var confirmed = SpaWith(AppointmentStatus.Confirmed, 1);
        var forConfirmed = Make(confirmed, 1);
        var confirmedError = await ThrownAsync(() => forConfirmed.Service.ConfirmSpaAsync(manager, confirmed.AppointmentId));

        var noStaff = SpaWith(AppointmentStatus.Pending, 1);
        var forNoStaff = Make(noStaff, 0);
        var noStaffError = await ThrownAsync(() => forNoStaff.Service.ConfirmSpaAsync(manager, noStaff.AppointmentId));

        var needsTwo = SpaWith(AppointmentStatus.Pending, 2);
        var forShort = Make(needsTwo, 1);
        var shortError = await ThrownAsync(() => forShort.Service.ConfirmSpaAsync(manager, needsTwo.AppointmentId));

        Check(customerError?.Code == ErrorCodes.Forbidden, "A non-manager must be rejected with Forbidden.");
        Check(unknownError?.Code == ErrorCodes.NotFound, "An unknown appointment must be rejected with NotFound.");
        Check(confirmedError?.Code == ErrorCodes.InvalidTransition, "A non-pending appointment must be rejected with InvalidTransition.");
        Check(noStaffError?.Code == ErrorCodes.StaffCountMismatch, "An appointment without assigned staff must be rejected with StaffCountMismatch.");
        Check(shortError?.Code == ErrorCodes.StaffCountMismatch, "An appointment with too few assigned staff must be rejected with StaffCountMismatch.");
        Check(noStaff.Status == AppointmentStatus.Pending && needsTwo.Status == AppointmentStatus.Pending,
            "Rejected confirmations must keep the appointment Pending.");
        Check(forCustomer.Repo.SaveCalls == 0
                && forUnknown.Repo.SaveCalls == 0
                && forConfirmed.Repo.SaveCalls == 0
                && forNoStaff.Repo.SaveCalls == 0
                && forShort.Repo.SaveCalls == 0,
            "Rejected confirmations must not save anything.");
    }),
    ("AssignmentService.ConfirmSpaAsync atomically assigns staff, validates shifts and confirms in one transaction", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var bath = Guid.NewGuid();
        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Small,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(60),
            BusyUntil = slotStart.AddMinutes(75),
            StaffRequired = 1,
        };
        var an = new SpaStaffCandidate(Guid.NewGuid(), "An");
        var shifts = new[] { new StaffShiftWindow(an.StaffId, slotStart.AddHours(-1), slotStart.AddHours(2)) };
        var repo = new TestAssignmentRepo(appointment, [an], [], new Dictionary<Guid, int>())
        {
            AmountInput = new SpaAmountInput(
                Species.Dog,
                [bath],
                [new ServicePricing { ServiceId = bath, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 100_000m }]),
        };
        var guard = new TestConcurrencyGuard();
        var service = new AssignmentService(repo, new TestScheduleRepo(15, false, shifts, []), guard, NoNotifier());

        var result = await service.ConfirmSpaAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Manager),
            appointment.AppointmentId,
            [an.StaffId],
            false);

        Check(result.Status == AppointmentStatus.Confirmed, "Appointment must be Confirmed.");
        Check(result.Amount == 100_000m, "Amount must be 100_000.");
        Check(repo.Added.Count == 1 && repo.Added[0].StaffId == an.StaffId && repo.Added[0].IsHolding,
            "Staff assignment must be added and holding.");
        Check(guard.RunCalls == 1, "Must run inside exactly one concurrency guard transaction.");
        Check(guard.LockedAppointmentId == appointment.AppointmentId, "Must lock appointment row.");
    }),
    ("AssignmentService.ConfirmSpaAsync enforces shift and maps missing price to ValidationError", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var bath = Guid.NewGuid();
        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Small,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(60),
            BusyUntil = slotStart.AddMinutes(75),
            StaffRequired = 1,
        };
        var an = new SpaStaffCandidate(Guid.NewGuid(), "An");
        var outOfShift = new[] { new StaffShiftWindow(an.StaffId, slotStart.AddHours(5), slotStart.AddHours(8)) };
        var repo = new TestAssignmentRepo(appointment, [an], [], new Dictionary<Guid, int>())
        {
            AmountInput = new SpaAmountInput(Species.Dog, [bath], []),
        };
        var guard = new TestConcurrencyGuard();
        var service = new AssignmentService(repo, new TestScheduleRepo(15, false, outOfShift, []), guard, NoNotifier());
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);

        async Task<BusinessException?> ThrownAsync(Func<Task> action)
        {
            try
            {
                await action();
                return null;
            }
            catch (BusinessException ex)
            {
                return ex;
            }
        }

        var shiftErr = await ThrownAsync(() =>
            service.ConfirmSpaAsync(manager, appointment.AppointmentId, [an.StaffId], false));
        Check(shiftErr?.Code == ErrorCodes.StaffOutOfShift, "Must reject out-of-shift staff with StaffOutOfShift.");

        var priceErr = await ThrownAsync(() =>
            service.ConfirmSpaAsync(manager, appointment.AppointmentId, [an.StaffId], true));
        Check(priceErr?.Code == ErrorCodes.ValidationError, "Missing service price must map to ValidationError.");
    }),
    ("ConfirmAppointmentRequestValidator requires one or two valid staffIds", () =>
    {
        var validator = new ConfirmAppointmentRequestValidator();

        var one = validator.Validate(new ConfirmAppointmentRequest([Guid.NewGuid()], false));
        var two = validator.Validate(new ConfirmAppointmentRequest([Guid.NewGuid(), Guid.NewGuid()], true));
        Check(one.IsValid && two.IsValid, "One or two staff ids must pass validation.");

        var missing = validator.Validate(new ConfirmAppointmentRequest(null, false));
        var empty = validator.Validate(new ConfirmAppointmentRequest([], false));
        var tooMany = validator.Validate(
            new ConfirmAppointmentRequest([Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid()], false));
        var emptyGuid = validator.Validate(new ConfirmAppointmentRequest([Guid.Empty], false));

        Check(!missing.IsValid && missing.Errors.Any(e => e.PropertyName == "StaffIds"), "Missing staffIds must fail.");
        Check(!empty.IsValid && empty.Errors.Any(e => e.PropertyName == "StaffIds"), "Empty staffIds must fail.");
        Check(!tooMany.IsValid && tooMany.Errors.Any(e => e.PropertyName == "StaffIds"), "More than two staffIds must fail.");
        Check(!emptyGuid.IsValid && emptyGuid.Errors.Any(e => e.PropertyName == "StaffIds"), "An empty Guid must fail.");

        var validCage = validator.Validate(new ConfirmAppointmentRequest(CageId: Guid.NewGuid()));
        Check(validCage.IsValid, "A valid cageId must pass validation without requiring staffIds.");

        var emptyCage = validator.Validate(new ConfirmAppointmentRequest(CageId: Guid.Empty));
        Check(!emptyCage.IsValid && emptyCage.Errors.Any(e => e.PropertyName == "CageId"), "An empty cageId must fail.");

        return Task.CompletedTask;
    }),
    ("AppointmentsController.Confirm rejects null request with ValidationError", async () =>
    {
        var controller = new AppointmentsController(null!);
        var threw = false;
        try
        {
            await controller.Confirm(Guid.NewGuid(), null, CancellationToken.None);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError)
        {
            threw = true;
        }

        Check(threw, "Controller must throw BusinessException(ValidationError) when request is null.");
    }),
    ("AppointmentsController.Confirm confirms a spa appointment through AssignmentService and returns only the status", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var bath = Guid.NewGuid();
        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Small,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(60),
            BusyUntil = slotStart.AddMinutes(75),
            StaffRequired = 1,
        };
        var an = new SpaStaffCandidate(Guid.NewGuid(), "An");
        var shifts = new[] { new StaffShiftWindow(an.StaffId, slotStart.AddHours(-1), slotStart.AddHours(2)) };
        var repo = new TestAssignmentRepo(appointment, [an], [], new Dictionary<Guid, int>())
        {
            AmountInput = new SpaAmountInput(
                Species.Dog,
                [bath],
                [new ServicePricing { ServiceId = bath, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 100_000m }]),
        };
        var service = new AssignmentService(repo, new TestScheduleRepo(15, false, shifts, []), new TestConcurrencyGuard(), NoNotifier());
        var controller = new AppointmentsController(null!, assignmentService: service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, Guid.NewGuid().ToString()),
                        new Claim(TokenClaims.Role, "Manager"),
                    ], "test")),
                },
            },
        };

        var ok = await controller.Confirm(
            appointment.AppointmentId, new ConfirmAppointmentRequest([an.StaffId], false), CancellationToken.None) as OkObjectResult;

        Check(ok?.Value is AppointmentStatusResponse { Status: AppointmentStatus.Confirmed },
            "Confirm must return 200 with the Confirmed status.");
        Check(appointment.Status == AppointmentStatus.Confirmed, "The appointment must be Confirmed.");
        Check(repo.Added.Count == 1 && repo.Added[0].StaffId == an.StaffId, "The chosen staff must be assigned.");

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        Check(JsonSerializer.Serialize(ok!.Value, options) == "{\"status\":\"Confirmed\"}",
            "The response body must contain only the status.");
    }),
    ("AssignmentService.ConfirmSpaAsync saves nothing when the amount cannot be calculated", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var bath = Guid.NewGuid();
        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Small,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(60),
            BusyUntil = slotStart.AddMinutes(75),
            StaffRequired = 1,
        };
        var an = new SpaStaffCandidate(Guid.NewGuid(), "An");
        var shifts = new[] { new StaffShiftWindow(an.StaffId, slotStart.AddHours(-1), slotStart.AddHours(2)) };
        var repo = new TestAssignmentRepo(appointment, [an], [], new Dictionary<Guid, int>())
        {
            AmountInput = new SpaAmountInput(Species.Dog, [bath], []),
        };
        var service = new AssignmentService(repo, new TestScheduleRepo(15, false, shifts, []), new TestConcurrencyGuard(), NoNotifier());

        BusinessException? thrown = null;
        try
        {
            await service.ConfirmSpaAsync(
                new CurrentUser(Guid.NewGuid(), UserRole.Manager), appointment.AppointmentId, [an.StaffId], false);
        }
        catch (BusinessException ex)
        {
            thrown = ex;
        }

        Check(thrown?.Code == ErrorCodes.ValidationError, "A missing service price must be reported as ValidationError.");
        Check(repo.SaveCalls == 0, "The Confirmed status must not be saved when the amount cannot be calculated.");
    }),
    ("AssignmentService.RejectSpaAsync cancels a pending appointment as StoreUnable, releases staff holds and saves once inside the concurrency guard", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(120),
            BusyUntil = slotStart.AddMinutes(135),
            StaffRequired = 2,
        };
        var repo = new TestAssignmentRepo(appointment, [], [], new Dictionary<Guid, int>());
        for (var i = 0; i < 2; i++)
        {
            repo.Added.Add(new AppointmentStaff
            {
                AppointmentId = appointment.AppointmentId,
                StaffId = Guid.NewGuid(),
                BusyFrom = slotStart,
                BusyUntil = appointment.BusyUntil,
                IsHolding = true,
                AssignedAt = DateTimeOffset.UtcNow,
            });
        }

        var guard = new TestConcurrencyGuard();
        var service = new AssignmentService(repo, new TestScheduleRepo(15, false, [], []), guard, NoNotifier());

        await service.RejectSpaAsync(new CurrentUser(Guid.NewGuid(), UserRole.Manager), appointment.AppointmentId);

        Check(appointment.Status == AppointmentStatus.Cancelled, "The appointment must be Cancelled.");
        Check(appointment.CancelReason == CancelReason.StoreUnable, "The cancel reason must be StoreUnable.");
        Check(appointment.CancelledAt is not null, "CancelledAt must be set.");
        Check(repo.Added.Count == 2 && repo.Added.All(r => !r.IsHolding),
            "Staff rows must be kept as history with IsHolding = false.");
        Check(guard.RunCalls == 1, "Rejecting must run inside exactly one concurrency guard transaction.");
        Check(guard.LockedAppointmentId == appointment.AppointmentId, "Rejecting must lock the appointment row.");
        Check(repo.SaveCalls == 1, "Rejecting must save exactly once.");
    }),
    ("AssignmentService.RejectSpaAsync rejects non-manager, unknown appointment and non-pending appointment without saving or releasing", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);

        SpaAppointment SpaWith(AppointmentStatus status) => new()
        {
            AppointmentId = Guid.NewGuid(),
            Status = status,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(120),
            BusyUntil = slotStart.AddMinutes(135),
            StaffRequired = 1,
        };

        (AssignmentService Service, TestAssignmentRepo Repo) Make(SpaAppointment target)
        {
            var repo = new TestAssignmentRepo(target, [], [], new Dictionary<Guid, int>());
            repo.Added.Add(new AppointmentStaff
            {
                AppointmentId = target.AppointmentId,
                StaffId = Guid.NewGuid(),
                BusyFrom = target.SlotStart,
                BusyUntil = target.BusyUntil,
                IsHolding = true,
                AssignedAt = DateTimeOffset.UtcNow,
            });

            return (new AssignmentService(repo, new TestScheduleRepo(15, false, [], []), new TestConcurrencyGuard(), NoNotifier()), repo);
        }

        async Task<BusinessException?> ThrownAsync(Func<Task> action)
        {
            try
            {
                await action();
                return null;
            }
            catch (BusinessException ex)
            {
                return ex;
            }
        }

        var pending = SpaWith(AppointmentStatus.Pending);
        var forCustomer = Make(pending);
        var customerError = await ThrownAsync(() => forCustomer.Service.RejectSpaAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Customer), pending.AppointmentId));

        var forUnknown = Make(pending);
        var unknownError = await ThrownAsync(() => forUnknown.Service.RejectSpaAsync(manager, Guid.NewGuid()));

        var confirmed = SpaWith(AppointmentStatus.Confirmed);
        var forConfirmed = Make(confirmed);
        var confirmedError = await ThrownAsync(() => forConfirmed.Service.RejectSpaAsync(manager, confirmed.AppointmentId));

        var cancelled = SpaWith(AppointmentStatus.Cancelled);
        var forCancelled = Make(cancelled);
        var cancelledError = await ThrownAsync(() => forCancelled.Service.RejectSpaAsync(manager, cancelled.AppointmentId));

        Check(customerError?.Code == ErrorCodes.Forbidden, "A non-manager must be rejected with Forbidden.");
        Check(unknownError?.Code == ErrorCodes.NotFound, "An unknown appointment must be rejected with NotFound.");
        Check(confirmedError?.Code == ErrorCodes.InvalidTransition, "A Confirmed appointment must be rejected with InvalidTransition.");
        Check(cancelledError?.Code == ErrorCodes.InvalidTransition, "A Cancelled appointment must be rejected with InvalidTransition.");
        Check(confirmed.Status == AppointmentStatus.Confirmed && confirmed.CancelReason is null,
            "A rejected request must not change the appointment.");
        Check(forConfirmed.Repo.Added.All(r => r.IsHolding) && forCancelled.Repo.Added.All(r => r.IsHolding),
            "A rejected request must not release staff holds.");
        Check(forCustomer.Repo.SaveCalls == 0
                && forUnknown.Repo.SaveCalls == 0
                && forConfirmed.Repo.SaveCalls == 0
                && forCancelled.Repo.SaveCalls == 0,
            "A rejected request must not save anything.");
    }),
    ("HotelAssignmentService.GetCageSuggestionAsync suggests the free cage with the smallest code for the stay's species and size group", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var stay = new HotelStayForAssignment(
            Guid.NewGuid(), AppointmentStatus.Pending, Species.Dog, SizeGroup.Small, checkIn, checkIn.AddDays(3));

        Cage CageOf(string code, Species species = Species.Dog, SizeGroup sizeGroup = SizeGroup.Small, bool isActive = true) => new()
        {
            CageId = Guid.NewGuid(),
            Code = code,
            Species = species,
            SizeGroup = sizeGroup,
            IsActive = isActive,
        };

        var inactive = CageOf("A01", isActive: false);
        var cat = CageOf("A02", Species.Cat);
        var medium = CageOf("A03", sizeGroup: SizeGroup.Medium);
        var occupied = CageOf("A10");
        var free = CageOf("A11");
        var other = CageOf("A12");

        var windows = new[] { new CageStayWindow(occupied.CageId, checkIn.AddDays(1), checkIn.AddDays(4)) };
        var service = new HotelAssignmentService(
            new TestHotelAssignmentRepo(stay, [inactive, cat, medium, occupied, free, other], windows),
            new ShopTimeZone(TimeZoneInfo.Utc),
            new TestConcurrencyGuard(),
            NoNotifier());

        var result = await service.GetCageSuggestionAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Manager), stay.AppointmentId);

        Check(result?.Cage?.CageId == free.CageId,
            "The suggestion must be the free active cage of the same species and size group with the smallest code.");
    }),
    ("HotelAssignmentService.GetCageSuggestionAsync returns no cage when every matching cage is occupied", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var stay = new HotelStayForAssignment(
            Guid.NewGuid(), AppointmentStatus.Pending, Species.Cat, SizeGroup.Medium, checkIn, checkIn.AddDays(2));
        var cage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = "C1",
            Species = Species.Cat,
            SizeGroup = SizeGroup.Medium,
            IsActive = true,
        };
        var windows = new[] { new CageStayWindow(cage.CageId, checkIn.AddDays(-1), checkIn.AddDays(1)) };
        var service = new HotelAssignmentService(
            new TestHotelAssignmentRepo(stay, [cage], windows), new ShopTimeZone(TimeZoneInfo.Utc), new TestConcurrencyGuard(), NoNotifier());

        var result = await service.GetCageSuggestionAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Manager), stay.AppointmentId);

        Check(result is not null && result.Cage is null, "A pending stay with no free cage must return a result with a null cage.");
    }),
    ("HotelAssignmentService.GetCageSuggestionAsync rejects non-manager and non-pending stays and returns null for an id that is not a hotel appointment", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var confirmed = new HotelStayForAssignment(
            Guid.NewGuid(), AppointmentStatus.Confirmed, Species.Dog, SizeGroup.Small, checkIn, checkIn.AddDays(2));
        var service = new HotelAssignmentService(
            new TestHotelAssignmentRepo(confirmed, [], []), new ShopTimeZone(TimeZoneInfo.Utc), new TestConcurrencyGuard(), NoNotifier());
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);

        async Task<string?> CodeOfAsync(Func<Task> action)
        {
            try
            {
                await action();
                return null;
            }
            catch (BusinessException ex)
            {
                return ex.Code;
            }
        }

        var forCustomer = await CodeOfAsync(() => service.GetCageSuggestionAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Customer), confirmed.AppointmentId));
        var forConfirmed = await CodeOfAsync(() => service.GetCageSuggestionAsync(manager, confirmed.AppointmentId));
        var forUnknown = await service.GetCageSuggestionAsync(manager, Guid.NewGuid());

        Check(forCustomer == ErrorCodes.Forbidden, "A non-manager must be rejected with Forbidden.");
        Check(forConfirmed == ErrorCodes.InvalidTransition, "A non-pending stay must be rejected with InvalidTransition.");
        Check(forUnknown is null, "An id that is not a hotel appointment must return null so the controller can try the spa branch.");
    }),
    ("HotelSuggestionsResponse follows the JSON contract and writes a null cage", () =>
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());

        Check(JsonSerializer.Serialize(new HotelSuggestionsResponse(null), options) == "{\"cage\":null}",
            "A missing cage must be written as null.");

        var cage = new Cage
        {
            CageId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Code = "A1",
            Species = Species.Dog,
            SizeGroup = SizeGroup.Small,
            IsActive = true,
        };
        var json = JsonSerializer.Serialize(HotelSuggestionsResponse.From(new HotelCageSuggestionResult(cage)), options);
        Check(json == "{\"cage\":{\"cageId\":\"11111111-1111-1111-1111-111111111111\",\"code\":\"A1\",\"species\":\"Dog\",\"sizeGroup\":\"Small\",\"isActive\":true}}",
            "The cage must contain cageId, code, species, sizeGroup and isActive in camelCase.");
        return Task.CompletedTask;
    }),
    ("AppointmentsController.GetSuggestions answers a hotel appointment with a cage and any other id with the spa suggestions", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var stay = new HotelStayForAssignment(
            Guid.NewGuid(), AppointmentStatus.Pending, Species.Dog, SizeGroup.Small, checkIn, checkIn.AddDays(2));
        var cage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = "A1",
            Species = Species.Dog,
            SizeGroup = SizeGroup.Small,
            IsActive = true,
        };
        var hotelService = new HotelAssignmentService(
            new TestHotelAssignmentRepo(stay, [cage], []), new ShopTimeZone(TimeZoneInfo.Utc), new TestConcurrencyGuard(), NoNotifier());

        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var spa = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(120),
            BusyUntil = slotStart.AddMinutes(135),
            StaffRequired = 1,
        };
        var spaService = new AssignmentService(
            new TestAssignmentRepo(spa, [], [], new Dictionary<Guid, int>()),
            new TestScheduleRepo(15, false, [], []),
            new TestConcurrencyGuard(),
            NoNotifier());

        var controller = new AppointmentsController(null!, assignmentService: spaService, hotelAssignmentService: hotelService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, Guid.NewGuid().ToString()),
                        new Claim(TokenClaims.Role, "Manager"),
                    ], "test")),
                },
            },
        };

        var hotelResult = await controller.GetSuggestions(stay.AppointmentId, CancellationToken.None) as OkObjectResult;
        Check(hotelResult?.Value is HotelSuggestionsResponse { Cage: { Code: "A1" } },
            "A hotel appointment must be answered with the suggested cage.");

        var spaResult = await controller.GetSuggestions(spa.AppointmentId, CancellationToken.None) as OkObjectResult;
        Check(spaResult?.Value is SpaSuggestionsResponse { StaffRequired: 1 },
            "A spa appointment must still be answered with the spa suggestions.");
    }),
    ("AppointmentsController.GetSuggestions uses AppointmentQueryService to dispatch by type", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var stay = new HotelStayForAssignment(
            Guid.NewGuid(), AppointmentStatus.Pending, Species.Dog, SizeGroup.Small, checkIn, checkIn.AddDays(2));
        var cage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = "B1",
            Species = Species.Dog,
            SizeGroup = SizeGroup.Small,
            IsActive = true,
        };
        var hotelService = new HotelAssignmentService(
            new TestHotelAssignmentRepo(stay, [cage], []), new ShopTimeZone(TimeZoneInfo.Utc), new TestConcurrencyGuard(), NoNotifier());

        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var spa = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(120),
            BusyUntil = slotStart.AddMinutes(135),
            StaffRequired = 1,
        };
        var spaService = new AssignmentService(
            new TestAssignmentRepo(spa, [], [], new Dictionary<Guid, int>()),
            new TestScheduleRepo(15, false, [], []),
            new TestConcurrencyGuard(),
            NoNotifier());

        var queryRepo = new TestAppointmentQueryRepo
        {
            FindTypeHandler = id => id == stay.AppointmentId ? AppointmentType.Hotel : id == spa.AppointmentId ? AppointmentType.Spa : null
        };
        var queryService = new AppointmentQueryService(queryRepo, new TestPetRepo(new Pet(), Guid.NewGuid()), new TestStaffRoleReader(null));

        var controller = new AppointmentsController(null!, appointmentQueryService: queryService, assignmentService: spaService, hotelAssignmentService: hotelService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, Guid.NewGuid().ToString()),
                        new Claim(TokenClaims.Role, "Manager"),
                    ], "test")),
                },
            },
        };

        var hotelResult = await controller.GetSuggestions(stay.AppointmentId, CancellationToken.None) as OkObjectResult;
        Check(hotelResult?.Value is HotelSuggestionsResponse { Cage: { Code: "B1" } }, "Hotel suggestion dispatched via AppointmentQueryService.");

        var spaResult = await controller.GetSuggestions(spa.AppointmentId, CancellationToken.None) as OkObjectResult;
        Check(spaResult?.Value is SpaSuggestionsResponse { StaffRequired: 1 }, "Spa suggestion dispatched via AppointmentQueryService.");

        var unknownId = Guid.NewGuid();
        var notFoundThrew = false;
        try
        {
            await controller.GetSuggestions(unknownId, CancellationToken.None);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.NotFound)
        {
            notFoundThrew = true;
        }
        Check(notFoundThrew, "Unknown appointment id must throw NotFound without querying hotel or spa suggestions.");
    }),
    ("AppointmentsController.Reject rejects a pending spa appointment and returns RejectAppointmentResponse", async () =>
    {
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var spa = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(120),
            BusyUntil = slotStart.AddMinutes(135),
            StaffRequired = 1,
        };
        var repo = new TestAssignmentRepo(spa, [], [], new Dictionary<Guid, int>());
        var spaService = new AssignmentService(repo, new TestScheduleRepo(15, false, [], []), new TestConcurrencyGuard(), NoNotifier());
        var controller = new AppointmentsController(null!, assignmentService: spaService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, Guid.NewGuid().ToString()),
                        new Claim(TokenClaims.Role, "Manager"),
                    ], "test")),
                },
            },
        };

        var result = await controller.Reject(spa.AppointmentId, CancellationToken.None) as OkObjectResult;
        Check(result?.Value is RejectAppointmentResponse { Status: AppointmentStatus.Cancelled, Reason: CancelReason.StoreUnable },
            "Reject must return Ok with RejectAppointmentResponse (Cancelled, StoreUnable).");
        Check(spa.Status == AppointmentStatus.Cancelled && spa.CancelReason == CancelReason.StoreUnable,
            "Spa appointment must be Cancelled with StoreUnable reason.");
    }),
    ("HotelAssignmentService.GetCageSuggestionAsync considers an overdue InStay stay as occupying the cage today", async () =>
    {
        var today = DateTimeOffset.UtcNow.Date;
        var checkIn = new DateTimeOffset(today, TimeSpan.Zero).AddHours(14);
        var stay = new HotelStayForAssignment(
            Guid.NewGuid(), AppointmentStatus.Pending, Species.Dog, SizeGroup.Small, checkIn, checkIn.AddDays(3));

        var overdueCage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = "A1",
            Species = Species.Dog,
            SizeGroup = SizeGroup.Small,
            IsActive = true,
        };
        var freeCage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = "A2",
            Species = Species.Dog,
            SizeGroup = SizeGroup.Small,
            IsActive = true,
        };

        var tomorrow = today.AddDays(1);
        var overdueWindow = new CageStayWindow(overdueCage.CageId, checkIn.AddDays(-3), new DateTimeOffset(tomorrow, TimeSpan.Zero));

        var service = new HotelAssignmentService(
            new TestHotelAssignmentRepo(stay, [overdueCage, freeCage], [overdueWindow]),
            new ShopTimeZone(TimeZoneInfo.Utc),
            new TestConcurrencyGuard(),
            NoNotifier());

        var result = await service.GetCageSuggestionAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Manager), stay.AppointmentId);

        Check(result?.Cage?.CageId == freeCage.CageId,
            "The overdue InStay cage A1 must be considered occupied today; free cage A2 must be suggested.");
    }),
    ("HotelAssignmentService.ConfirmHotelAsync rejects assigning a cage currently occupied by an overdue InStay stay today", async () =>
    {
        var today = DateTimeOffset.UtcNow.Date;
        var checkIn = new DateTimeOffset(today, TimeSpan.Zero).AddHours(14);
        var stay = new HotelAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkIn.AddDays(2),
        };
        var cage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = "A1",
            Species = Species.Dog,
            SizeGroup = SizeGroup.Small,
            IsActive = true,
        };
        var tomorrow = today.AddDays(1);
        var overdueWindow = new CageStayWindow(cage.CageId, checkIn.AddDays(-3), new DateTimeOffset(tomorrow, TimeSpan.Zero));
        var repo = new TestHotelAssignmentRepo(null, [cage], [overdueWindow]) { Appointment = stay };
        var service = new HotelAssignmentService(repo, new ShopTimeZone(TimeZoneInfo.Utc), new TestConcurrencyGuard(), NoNotifier());

        string? errorCode = null;
        try
        {
            await service.ConfirmHotelAsync(
                new CurrentUser(Guid.NewGuid(), UserRole.Manager), stay.AppointmentId, cage.CageId);
        }
        catch (BusinessException ex)
        {
            errorCode = ex.Code;
        }

        Check(errorCode == ErrorCodes.CageConflict, "Confirming a cage with an overdue InStay pet must throw CAGE_CONFLICT.");
        Check(stay.Status == AppointmentStatus.Pending && stay.CageId is null, "The stay must remain Pending without cage.");
        Check(repo.SaveCalls == 0, "Nothing must be saved on conflict.");
    }),
    ("HotelAssignmentService.ConfirmHotelAsync assigns the chosen free cage, confirms the stay and saves once inside the concurrency guard", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var stay = new HotelAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkIn.AddDays(2),
        };
        var cage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = "A1",
            Species = Species.Dog,
            SizeGroup = SizeGroup.Small,
            IsActive = true,
        };
        var endsOnCheckInDate = new CageStayWindow(cage.CageId, checkIn.AddDays(-2), checkIn);
        var repo = new TestHotelAssignmentRepo(null, [cage], [endsOnCheckInDate]) { Appointment = stay };
        var guard = new TestConcurrencyGuard();
        var service = new HotelAssignmentService(repo, new ShopTimeZone(TimeZoneInfo.Utc), guard, NoNotifier());

        var status = await service.ConfirmHotelAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Manager), stay.AppointmentId, cage.CageId);

        Check(status == AppointmentStatus.Confirmed, "The returned status must be Confirmed.");
        Check(stay.Status == AppointmentStatus.Confirmed, "The stay must be moved to Confirmed.");
        Check(stay.CageId == cage.CageId, "The chosen cage must be assigned to the stay.");
        Check(guard.RunCalls == 1, "Confirming must run inside exactly one concurrency guard transaction.");
        Check(guard.LockedHotelGroup == (Species.Dog, SizeGroup.Small), "Confirming must lock the hotel group advisory lock.");
        Check(guard.LockedAppointmentId == stay.AppointmentId, "Confirming must lock the appointment row.");
        Check(string.Join(",", guard.LockOrder) == "lock-hotel-group,lock-appointment",
            "The hotel group lock must be taken before the appointment row lock.");
        Check(repo.SaveCalls == 1, "Confirming must save exactly once.");
    }),
    ("HotelAssignmentService.ConfirmHotelAsync rejects non-manager, unknown stay, unknown cage, wrong state, unsuitable cage and overlapping stay without saving", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);

        Cage CageOf(Species species = Species.Dog) => new()
        {
            CageId = Guid.NewGuid(),
            Code = "A1",
            Species = species,
            SizeGroup = SizeGroup.Small,
            IsActive = true,
        };

        HotelAppointment StayOf(AppointmentStatus status = AppointmentStatus.Pending) => new()
        {
            AppointmentId = Guid.NewGuid(),
            Status = status,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkIn.AddDays(2),
        };

        (HotelAssignmentService Service, TestHotelAssignmentRepo Repo) Make(
            HotelAppointment stay, Cage cage, IReadOnlyList<CageStayWindow> windows)
        {
            var repo = new TestHotelAssignmentRepo(null, [cage], windows) { Appointment = stay };
            return (new HotelAssignmentService(repo, new ShopTimeZone(TimeZoneInfo.Utc), new TestConcurrencyGuard(), NoNotifier()), repo);
        }

        async Task<string?> CodeOfAsync(Func<Task> action)
        {
            try
            {
                await action();
                return null;
            }
            catch (BusinessException ex)
            {
                return ex.Code;
            }
        }

        var cage = CageOf();

        var customerStay = StayOf();
        var customerCase = Make(customerStay, cage, []);

        var unknownStayCase = Make(StayOf(), cage, []);

        var unknownCageStay = StayOf();
        var unknownCageCase = Make(unknownCageStay, cage, []);

        var confirmedStay = StayOf(AppointmentStatus.Confirmed);
        var confirmedCase = Make(confirmedStay, cage, []);

        var catCage = CageOf(Species.Cat);
        var catStay = StayOf();
        var catCase = Make(catStay, catCage, []);

        var overlapStay = StayOf();
        var overlapCase = Make(
            overlapStay, cage, [new CageStayWindow(cage.CageId, checkIn.AddDays(1), checkIn.AddDays(4))]);

        var forCustomer = await CodeOfAsync(() => customerCase.Service.ConfirmHotelAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Customer), customerStay.AppointmentId, cage.CageId));
        var forUnknownStay = await CodeOfAsync(() => unknownStayCase.Service.ConfirmHotelAsync(
            manager, Guid.NewGuid(), cage.CageId));
        var forUnknownCage = await CodeOfAsync(() => unknownCageCase.Service.ConfirmHotelAsync(
            manager, unknownCageStay.AppointmentId, Guid.NewGuid()));
        var forConfirmed = await CodeOfAsync(() => confirmedCase.Service.ConfirmHotelAsync(
            manager, confirmedStay.AppointmentId, cage.CageId));
        var forCat = await CodeOfAsync(() => catCase.Service.ConfirmHotelAsync(
            manager, catStay.AppointmentId, catCage.CageId));
        var forOverlap = await CodeOfAsync(() => overlapCase.Service.ConfirmHotelAsync(
            manager, overlapStay.AppointmentId, cage.CageId));

        Check(forCustomer == ErrorCodes.Forbidden, "A non-manager must be rejected with Forbidden.");
        Check(forUnknownStay == ErrorCodes.NotFound, "An unknown stay must be rejected with NotFound.");
        Check(forUnknownCage == ErrorCodes.NotFound, "An unknown cage must be rejected with NotFound.");
        Check(forConfirmed == ErrorCodes.InvalidTransition, "A non-pending stay must be rejected with InvalidTransition.");
        Check(forCat == ErrorCodes.CageConflict, "A cage of another species must be rejected with CageConflict.");
        Check(forOverlap == ErrorCodes.CageConflict, "A cage occupied on an overlapping night must be rejected with CageConflict.");
        Check(customerStay.Status == AppointmentStatus.Pending && customerStay.CageId is null
                && unknownCageStay.Status == AppointmentStatus.Pending && unknownCageStay.CageId is null
                && catStay.Status == AppointmentStatus.Pending && catStay.CageId is null
                && overlapStay.Status == AppointmentStatus.Pending && overlapStay.CageId is null
                && confirmedStay.Status == AppointmentStatus.Confirmed && confirmedStay.CageId is null,
            "A rejected request must not change the stay.");
        Check(customerCase.Repo.SaveCalls == 0
                && unknownStayCase.Repo.SaveCalls == 0
                && unknownCageCase.Repo.SaveCalls == 0
                && confirmedCase.Repo.SaveCalls == 0
                && catCase.Repo.SaveCalls == 0
                && overlapCase.Repo.SaveCalls == 0,
            "A rejected request must not save anything.");
    }),
    ("AppointmentsController.Confirm confirms a hotel appointment with cageId and returns the new status", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var stay = new HotelAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkIn.AddDays(2),
        };
        var cage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = "A1",
            Species = Species.Dog,
            SizeGroup = SizeGroup.Small,
            IsActive = true,
        };
        var hotelService = new HotelAssignmentService(
            new TestHotelAssignmentRepo(null, [cage], []) { Appointment = stay },
            new ShopTimeZone(TimeZoneInfo.Utc),
            new TestConcurrencyGuard(),
            NoNotifier());
        var queryRepo = new TestAppointmentQueryRepo
        {
            FindTypeHandler = id => id == stay.AppointmentId ? AppointmentType.Hotel : null
        };
        var queryService = new AppointmentQueryService(queryRepo, new TestPetRepo(new Pet(), Guid.NewGuid()), new TestStaffRoleReader(null));

        var controller = new AppointmentsController(null!, appointmentQueryService: queryService, hotelAssignmentService: hotelService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, Guid.NewGuid().ToString()),
                        new Claim(TokenClaims.Role, "Manager"),
                    ], "test")),
                },
            },
        };

        var result = await controller.Confirm(
            stay.AppointmentId, new ConfirmAppointmentRequest(CageId: cage.CageId), CancellationToken.None) as OkObjectResult;

        Check(result?.Value is AppointmentStatusResponse { Status: AppointmentStatus.Confirmed },
            "Confirm must return Ok with AppointmentStatusResponse (Confirmed).");
        Check(stay.CageId == cage.CageId, "Confirm must assign the requested cage to the hotel appointment.");
    }),
    ("HotelAssignmentService.RejectHotelAsync cancels a pending stay with StoreUnable and saves once inside the concurrency guard", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var stay = new HotelAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkIn.AddDays(2),
        };
        var repo = new TestHotelAssignmentRepo(null, [], []) { Appointment = stay };
        var guard = new TestConcurrencyGuard();
        var service = new HotelAssignmentService(repo, new ShopTimeZone(TimeZoneInfo.Utc), guard, NoNotifier());

        await service.RejectHotelAsync(new CurrentUser(Guid.NewGuid(), UserRole.Manager), stay.AppointmentId);

        Check(stay.Status == AppointmentStatus.Cancelled && stay.CancelReason == CancelReason.StoreUnable,
            "The stay must be Cancelled with the StoreUnable reason.");
        Check(guard.RunCalls == 1, "Rejecting must run inside exactly one concurrency guard transaction.");
        Check(guard.LockedAppointmentId == stay.AppointmentId, "Rejecting must lock the appointment row.");
        Check(repo.SaveCalls == 1, "Rejecting must save exactly once.");
    }),
    ("HotelAssignmentService.RejectHotelAsync rejects non-manager, unknown stay and non-pending stay without saving", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);

        HotelAppointment StayOf(AppointmentStatus status) => new()
        {
            AppointmentId = Guid.NewGuid(),
            Status = status,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkIn.AddDays(2),
        };

        async Task<string?> CodeOfAsync(Func<Task> action)
        {
            try
            {
                await action();
                return null;
            }
            catch (BusinessException ex)
            {
                return ex.Code;
            }
        }

        var pending = StayOf(AppointmentStatus.Pending);
        var forCustomerRepo = new TestHotelAssignmentRepo(null, [], []) { Appointment = pending };
        var forUnknownRepo = new TestHotelAssignmentRepo(null, [], []) { Appointment = StayOf(AppointmentStatus.Pending) };
        var confirmed = StayOf(AppointmentStatus.Confirmed);
        var forConfirmedRepo = new TestHotelAssignmentRepo(null, [], []) { Appointment = confirmed };

        HotelAssignmentService ServiceOf(TestHotelAssignmentRepo repo) =>
            new(repo, new ShopTimeZone(TimeZoneInfo.Utc), new TestConcurrencyGuard(), TestNotifiers.NoNotifier());

        var forCustomer = await CodeOfAsync(() => ServiceOf(forCustomerRepo).RejectHotelAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Customer), pending.AppointmentId));
        var forUnknown = await CodeOfAsync(() => ServiceOf(forUnknownRepo).RejectHotelAsync(manager, Guid.NewGuid()));
        var forConfirmed = await CodeOfAsync(() => ServiceOf(forConfirmedRepo).RejectHotelAsync(manager, confirmed.AppointmentId));

        Check(forCustomer == ErrorCodes.Forbidden, "A non-manager must be rejected with Forbidden.");
        Check(forUnknown == ErrorCodes.NotFound, "An unknown stay must be rejected with NotFound.");
        Check(forConfirmed == ErrorCodes.InvalidTransition, "A non-pending stay must be rejected with InvalidTransition.");
        Check(pending.Status == AppointmentStatus.Pending && confirmed.Status == AppointmentStatus.Confirmed,
            "A rejected request must not change the stay.");
        Check(forCustomerRepo.SaveCalls == 0 && forUnknownRepo.SaveCalls == 0 && forConfirmedRepo.SaveCalls == 0,
            "A rejected request must not save anything.");
    }),
    ("TC-10: Hai yêu cầu xác nhận đồng thời trên cùng một chuồng trống: đúng 1 yêu cầu thành công, yêu cầu còn lại nhận lỗi xung đột CAGE_CONFLICT", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);

        var cage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = "A1",
            Species = Species.Dog,
            SizeGroup = SizeGroup.Small,
            IsActive = true,
        };

        var stay1 = new HotelAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkIn.AddDays(2),
        };

        var stay2 = new HotelAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkIn.AddDays(2),
        };

        var appointments = new Dictionary<Guid, HotelAppointment>
        {
            [stay1.AppointmentId] = stay1,
            [stay2.AppointmentId] = stay2,
        };

        var repoLock = new object();
        var sharedRepo = new ConcurrentTestHotelAssignmentRepo(appointments, [cage], repoLock);
        var sharedGuard = new SimulatedAdvisoryConcurrencyGuard();
        var service = new HotelAssignmentService(sharedRepo, new ShopTimeZone(TimeZoneInfo.Utc), sharedGuard, NoNotifier());

        async Task<(AppointmentStatus? Status, string? ErrorCode)> ExecAsync(Guid appointmentId)
        {
            try
            {
                var status = await service.ConfirmHotelAsync(manager, appointmentId, cage.CageId);
                return (status, null);
            }
            catch (BusinessException ex)
            {
                return (null, ex.Code);
            }
        }

        var results = await Task.WhenAll(
            Task.Run(() => ExecAsync(stay1.AppointmentId)),
            Task.Run(() => ExecAsync(stay2.AppointmentId)));

        var successes = results.Count(r => r.Status == AppointmentStatus.Confirmed);
        var conflicts = results.Count(r => r.ErrorCode == ErrorCodes.CageConflict);

        Check(successes == 1, $"Exactly 1 request must succeed with Confirmed, but got {successes}.");
        Check(conflicts == 1, $"Exactly 1 request must fail with CAGE_CONFLICT, but got {conflicts}.");

        var confirmedStays = appointments.Values.Where(s => s.Status == AppointmentStatus.Confirmed).ToList();
        Check(confirmedStays.Count == 1 && confirmedStays[0].CageId == cage.CageId,
            "Exactly one stay must be confirmed and assigned to the cage.");
    }),
    ("HotelAssignmentService.ConfirmHotelAsync returns 404 NOT_FOUND when pet record is missing", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var stay = new HotelAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkIn.AddDays(2),
        };
        var repo = new MissingPetTestHotelAssignmentRepo(stay);
        var service = new HotelAssignmentService(repo, new ShopTimeZone(TimeZoneInfo.Utc), new TestConcurrencyGuard(), NoNotifier());

        string? errorCode = null;
        try
        {
            await service.ConfirmHotelAsync(new CurrentUser(Guid.NewGuid(), UserRole.Manager), stay.AppointmentId, Guid.NewGuid());
        }
        catch (BusinessException ex)
        {
            errorCode = ex.Code;
        }

        Check(errorCode == ErrorCodes.NotFound, "Missing pet record must result in NotFound, not 500 error.");
    }),
    ("HotelAssignmentService.RejectHotelAsync succeeds using FindAppointmentAsync even when pet record is missing", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var stay = new HotelAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkIn.AddDays(2),
        };
        var repo = new MissingPetTestHotelAssignmentRepo(stay);
        var service = new HotelAssignmentService(repo, new ShopTimeZone(TimeZoneInfo.Utc), new TestConcurrencyGuard(), NoNotifier());

        await service.RejectHotelAsync(new CurrentUser(Guid.NewGuid(), UserRole.Manager), stay.AppointmentId);

        Check(stay.Status == AppointmentStatus.Cancelled && stay.CancelReason == CancelReason.StoreUnable,
            "Rejecting must succeed using FindAppointmentAsync even when pet species is not joined.");
    }),
    ("AppointmentsController.Reject rejects a pending hotel appointment and returns RejectAppointmentResponse", async () =>
    {
        var checkIn = new DateTimeOffset(2026, 11, 20, 2, 0, 0, TimeSpan.Zero);
        var stay = new HotelAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkIn.AddDays(2),
        };
        var hotelService = new HotelAssignmentService(
            new TestHotelAssignmentRepo(null, [], []) { Appointment = stay },
            new ShopTimeZone(TimeZoneInfo.Utc),
            new TestConcurrencyGuard(),
            NoNotifier());
        var queryRepo = new TestAppointmentQueryRepo
        {
            FindTypeHandler = id => id == stay.AppointmentId ? AppointmentType.Hotel : null
        };
        var queryService = new AppointmentQueryService(queryRepo, new TestPetRepo(new Pet(), Guid.NewGuid()), new TestStaffRoleReader(null));

        var controller = new AppointmentsController(null!, appointmentQueryService: queryService, hotelAssignmentService: hotelService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, Guid.NewGuid().ToString()),
                        new Claim(TokenClaims.Role, "Manager"),
                    ], "test")),
                },
            },
        };

        var result = await controller.Reject(stay.AppointmentId, CancellationToken.None) as OkObjectResult;

        Check(result?.Value is RejectAppointmentResponse { Status: AppointmentStatus.Cancelled, Reason: CancelReason.StoreUnable },
            "Reject must return Ok with RejectAppointmentResponse (Cancelled, StoreUnable).");
        Check(stay.Status == AppointmentStatus.Cancelled && stay.CancelReason == CancelReason.StoreUnable,
            "The hotel appointment must be Cancelled with the StoreUnable reason.");
    }),
    ("HotelBookingService.HasCapacityAsync counts held stays per night in shop time zone for the pet's species and size group", async () =>
    {
        var ownerUserId = Guid.NewGuid();
        var pet = new Pet { PetId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), Species = Species.Cat, SizeGroup = SizeGroup.Small, IsActive = true };
        var held = new[]
        {
            new HeldHotelStay(new DateTimeOffset(2026, 11, 11, 7, 0, 0, TimeSpan.Zero), new DateTimeOffset(2026, 11, 13, 5, 0, 0, TimeSpan.Zero)),
            new HeldHotelStay(new DateTimeOffset(2026, 11, 11, 7, 0, 0, TimeSpan.Zero), new DateTimeOffset(2026, 11, 12, 5, 0, 0, TimeSpan.Zero)),
        };
        var repo = new TestHotelBookingRepo(2, held);
        var service = new HotelBookingService(
            new TestPetRepo(pet, ownerUserId),
            new TestStaffRoleReader(null),
            repo,
            new TestHotelCatalogRepo(),
            new ShopTimeZone(TimeZoneInfo.Utc),
            new TestConcurrencyGuard(),
            NoNotifier());
        var user = new CurrentUser(ownerUserId, UserRole.Customer);

        var fullOnNov11 = await service.HasCapacityAsync(
            user, pet.PetId,
            new DateTimeOffset(2026, 11, 10, 14, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 11, 12, 12, 0, 0, TimeSpan.Zero));
        var freeFromNov12 = await service.HasCapacityAsync(
            user, pet.PetId,
            new DateTimeOffset(2026, 11, 12, 14, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 11, 14, 12, 0, 0, TimeSpan.Zero));

        Check(!fullOnNov11, "Both cages are held on the night of 11/11, so there must be no capacity.");
        Check(freeFromNov12, "Only one stay holds the night of 12/11, so one cage must remain.");
        Check(repo.LastSpecies == Species.Cat && repo.LastSizeGroup == SizeGroup.Small,
            "The cage and stay queries must use the pet's species and size group.");
    }),
    ("HotelBookingService.HasCapacityAsync enforces pet visibility and a check-out date after the check-in date", async () =>
    {
        var ownerUserId = Guid.NewGuid();
        var pet = new Pet { PetId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), Species = Species.Dog, SizeGroup = SizeGroup.Large, IsActive = true };
        var checkIn = new DateTimeOffset(2026, 11, 10, 14, 0, 0, TimeSpan.Zero);
        var checkOut = new DateTimeOffset(2026, 11, 12, 12, 0, 0, TimeSpan.Zero);

        HotelBookingService ServiceFor(StaffRole? staffRole) => new(
            new TestPetRepo(pet, ownerUserId),
            new TestStaffRoleReader(staffRole),
            new TestHotelBookingRepo(1, []),
            new TestHotelCatalogRepo(),
            new ShopTimeZone(TimeZoneInfo.Utc),
            new TestConcurrencyGuard(),
            NoNotifier());

        async Task<string?> CodeOfAsync(Func<Task> action)
        {
            try
            {
                await action();
                return null;
            }
            catch (BusinessException ex)
            {
                return ex.Code;
            }
        }

        var owner = new CurrentUser(ownerUserId, UserRole.Customer);
        var receptionist = new CurrentUser(Guid.NewGuid(), UserRole.Staff);
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);

        Check(await ServiceFor(null).HasCapacityAsync(owner, pet.PetId, checkIn, checkOut),
            "The owner must be able to check capacity for the own pet.");
        Check(await ServiceFor(StaffRole.Receptionist).HasCapacityAsync(receptionist, pet.PetId, checkIn, checkOut),
            "A receptionist must be able to check capacity for any pet.");
        Check(await ServiceFor(null).HasCapacityAsync(manager, pet.PetId, checkIn, checkOut),
            "A manager must be able to check capacity for any pet.");

        var otherCustomer = await CodeOfAsync(() => ServiceFor(null).HasCapacityAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Customer), pet.PetId, checkIn, checkOut));
        var spaStaff = await CodeOfAsync(() => ServiceFor(StaffRole.SpaStaff).HasCapacityAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Staff), pet.PetId, checkIn, checkOut));
        var unknownPet = await CodeOfAsync(() => ServiceFor(null).HasCapacityAsync(
            owner, Guid.NewGuid(), checkIn, checkOut));
        var sameDay = await CodeOfAsync(() => ServiceFor(null).HasCapacityAsync(
            owner, pet.PetId, checkIn, checkIn.AddHours(6)));

        Check(otherCustomer == ErrorCodes.Forbidden, "A customer must not see another customer's pet.");
        Check(spaStaff == ErrorCodes.Forbidden, "Spa staff must be rejected with Forbidden.");
        Check(unknownPet == ErrorCodes.NotFound, "An unknown pet must be rejected with NotFound.");
        Check(sameDay == ErrorCodes.ValidationError, "A check-out on the check-in date must be rejected with ValidationError.");
    }),
    ("VnpayPaymentGateway signs the sandbox payment URL with HMACSHA512 over the encoded sorted payload", () =>
    {
        var gateway = new VnpayPaymentGateway(ValidVnpayGatewayOptions());
        var url = gateway.CreatePaymentUrl(VnpayTransaction(), "203.0.113.7");

        const string expectedQuery =
            "vnp_Amount=15000000&vnp_Command=pay&vnp_CreateDate=20261112170000&vnp_CurrCode=VND"
            + "&vnp_ExpireDate=20261112171500&vnp_IpAddr=203.0.113.7&vnp_Locale=vn"
            + "&vnp_OrderInfo=Thanh+toan+lich+hen+ABC123def456&vnp_OrderType=other"
            + "&vnp_ReturnUrl=https%3A%2F%2Fexample.test%2Fpayments%2Fvnpay%2Freturn"
            + "&vnp_TmnCode=TESTCODE&vnp_TxnRef=ABC123def456&vnp_Version=2.1.0";
        const string expectedHash =
            "688ac99797ed07cfe433c77ff5735a80420ed27bb634645ca2ca04188cf8ad84936ffcbb353edec51fa07a9e2ec466e96a698ebdb91f6c8642eb90727421f372";

        Check(url == $"{VnpayPaymentGateway.SandboxPaymentUrl}?{expectedQuery}&vnp_SecureHash={expectedHash}",
            "The URL must be the sandbox address, the encoded sorted query and the lowercase HMACSHA512 hash as the last parameter.");
        Check(url.IndexOf("vnp_SecureHash=", StringComparison.Ordinal) == url.LastIndexOf("vnp_SecureHash=", StringComparison.Ordinal),
            "vnp_SecureHash must appear exactly once.");
        return Task.CompletedTask;
    }),
    ("VnpayPaymentGateway identifies as VNPAY, depends on the secret and reuses the builder validation", () =>
    {
        var gateway = new VnpayPaymentGateway(ValidVnpayGatewayOptions());
        Check(gateway.Gateway == PaymentGateway.VNPAY, "The adapter must report the VNPAY gateway.");

        var other = new VnpayPaymentGateway(new VnpayOptions
        {
            TmnCode = "TESTCODE",
            HashSecret = "ANOTHERSECRETKEY0123456789ABCDE",
            ReturnUrl = "https://example.test/payments/vnpay/return",
        });
        var first = gateway.CreatePaymentUrl(VnpayTransaction(), "203.0.113.7");
        Check(first == gateway.CreatePaymentUrl(VnpayTransaction(), "203.0.113.7"), "The same input must produce the same URL.");
        Check(first != other.CreatePaymentUrl(VnpayTransaction(), "203.0.113.7"), "A different secret must produce a different URL.");

        AssertThrows<ArgumentException>(
            () => gateway.CreatePaymentUrl(VnpayTransaction(gateway: PaymentGateway.MoMo), "203.0.113.7"),
            "A MoMo transaction must be rejected.");
        AssertThrows<ArgumentException>(
            () => gateway.CreatePaymentUrl(VnpayTransaction(), "not-an-ip"),
            "An invalid client IP must be rejected.");
        return Task.CompletedTask;
    }),
    ("VnpayPaymentGateway rejects missing HashSecret and invalid builder configuration", () =>
    {
        foreach (var secret in new[] { "", "   " })
        {
            AssertThrows<InvalidOperationException>(
                () => new VnpayPaymentGateway(new VnpayOptions
                {
                    TmnCode = "TESTCODE",
                    HashSecret = secret,
                    ReturnUrl = "https://example.test/payments/vnpay/return",
                }),
                $"HashSecret '{secret}' must be rejected.");
        }

        AssertThrows<InvalidOperationException>(
            () => new VnpayPaymentGateway(new VnpayOptions
            {
                TmnCode = "SHORT",
                HashSecret = "SANDBOXSECRETKEY0123456789ABCDEF",
                ReturnUrl = "https://example.test/payments/vnpay/return",
            }),
            "An invalid TmnCode must still be rejected.");
        return Task.CompletedTask;
    }),
    ("VnpayPaymentGateway accepts a callback signed over the sorted encoded vnp_ parameters", () =>
    {
        var gateway = new VnpayPaymentGateway(ValidVnpayGatewayOptions());

        var callback = VnpayCallback();
        Check(gateway.VerifyCallbackSignature(callback), "A callback signed with the shared secret must be accepted.");

        callback["vnp_SecureHash"] = callback["vnp_SecureHash"].ToUpperInvariant();
        Check(gateway.VerifyCallbackSignature(callback), "The received hash must be compared case-insensitively.");

        var withIgnored = VnpayCallback();
        withIgnored["vnp_SecureHashType"] = "HmacSHA512";
        withIgnored["utm_source"] = "mail";
        Check(gateway.VerifyCallbackSignature(withIgnored),
            "vnp_SecureHashType and parameters without the vnp_ prefix must not be signed.");

        var withEmpty = VnpayCallback("fbd0e7c10762d709d650e3d514f48c9ff1cce33a294f8d30f63ba7b7ec760de24df69d42d737fa12d27647b92d98bf5e0cf9149b7965f4ef1504f40e8f419b48");
        withEmpty["vnp_BankTranNo"] = "";
        Check(gateway.VerifyCallbackSignature(withEmpty), "Parameters with an empty value must not be signed.");
        return Task.CompletedTask;
    }),
    ("VnpayPaymentGateway rejects callbacks with a missing, wrong or tampered signature", () =>
    {
        var gateway = new VnpayPaymentGateway(ValidVnpayGatewayOptions());
        var validHash = VnpayCallback()["vnp_SecureHash"];

        var missing = VnpayCallback();
        missing.Remove("vnp_SecureHash");
        Check(!gateway.VerifyCallbackSignature(missing), "A callback without vnp_SecureHash must be rejected.");

        foreach (var invalid in new[] { "", "0", validHash[..^1], validHash + "0", new string('0', 128) })
        {
            var callback = VnpayCallback(invalid);
            Check(!gateway.VerifyCallbackSignature(callback), $"The hash '{invalid}' must be rejected.");
        }

        foreach (var (key, value) in new[]
        {
            ("vnp_Amount", "1500000"),
            ("vnp_TxnRef", "ABC123def457"),
            ("vnp_ResponseCode", "24"),
            ("vnp_TransactionStatus", "02"),
        })
        {
            var tampered = VnpayCallback();
            tampered[key] = value;
            Check(!gateway.VerifyCallbackSignature(tampered), $"Changing {key} must invalidate the signature.");
        }

        var added = VnpayCallback();
        added["vnp_Extra"] = "1";
        Check(!gateway.VerifyCallbackSignature(added), "Adding a vnp_ parameter must invalidate the signature.");

        var removed = VnpayCallback();
        removed.Remove("vnp_BankCode");
        Check(!gateway.VerifyCallbackSignature(removed), "Removing a signed parameter must invalidate the signature.");

        var otherSecret = new VnpayPaymentGateway(new VnpayOptions
        {
            TmnCode = "TESTCODE",
            HashSecret = "ANOTHERSECRETKEY0123456789ABCDE",
            ReturnUrl = "https://example.test/payments/vnpay/return",
        });
        Check(!otherSecret.VerifyCallbackSignature(VnpayCallback()), "A callback signed with another secret must be rejected.");

        Check(!gateway.VerifyCallbackSignature(new Dictionary<string, string>()), "An empty callback must be rejected.");
        Check(!gateway.VerifyCallbackSignature(new Dictionary<string, string> { ["vnp_SecureHash"] = validHash }), "A callback with only vnp_SecureHash must be rejected.");
        AssertThrows<ArgumentNullException>(() => gateway.VerifyCallbackSignature(null!), "Null parameters must be rejected.");
        return Task.CompletedTask;
    }),
    ("VnpayPaymentGateway.ReadCallback maps a successful callback", () =>
    {
        var gateway = new VnpayPaymentGateway(ValidVnpayGatewayOptions());

        var callback = gateway.ReadCallback(VnpayCallback());

        Check(callback is { TxnRef: "ABC123def456", ConfirmedAmount: 150000m, Succeeded: true },
            "TxnRef, the amount divided by 100 and a successful result must be read from the callback.");
        return Task.CompletedTask;
    }),
    ("VnpayPaymentGateway.ReadCallback treats any code other than 00 as a failed result", () =>
    {
        var gateway = new VnpayPaymentGateway(ValidVnpayGatewayOptions());

        foreach (var (key, value) in new[] { ("vnp_ResponseCode", "24"), ("vnp_TransactionStatus", "02") })
        {
            var parameters = VnpayCallback();
            parameters[key] = value;
            var callback = gateway.ReadCallback(parameters);
            Check(callback is { Succeeded: false, TxnRef: "ABC123def456", ConfirmedAmount: 150000m },
                $"{key}={value} must be read as a failed result.");
        }

        var odd = VnpayCallback();
        odd["vnp_Amount"] = "15000050";
        Check(gateway.ReadCallback(odd)?.ConfirmedAmount == 150000.50m,
            "An amount that is not a whole number of VND must not be rounded.");
        return Task.CompletedTask;
    }),
    ("VnpayPaymentGateway.ReadCallback returns null when a required parameter is missing or malformed", () =>
    {
        var gateway = new VnpayPaymentGateway(ValidVnpayGatewayOptions());

        foreach (var key in new[] { "vnp_TxnRef", "vnp_Amount", "vnp_ResponseCode", "vnp_TransactionStatus" })
        {
            var parameters = VnpayCallback();
            parameters.Remove(key);
            Check(gateway.ReadCallback(parameters) is null, $"A callback without {key} must be unreadable.");
        }

        foreach (var invalid in new[] { "", "abc", "-100", "1.5", "15000000 ", "1e5" })
        {
            var parameters = VnpayCallback();
            parameters["vnp_Amount"] = invalid;
            Check(gateway.ReadCallback(parameters) is null, $"The amount '{invalid}' must be unreadable.");
        }

        var emptyRef = VnpayCallback();
        emptyRef["vnp_TxnRef"] = "";
        Check(gateway.ReadCallback(emptyRef) is null, "An empty TxnRef must be unreadable.");

        AssertThrows<ArgumentNullException>(() => gateway.ReadCallback(null!), "Null parameters must be rejected.");
        return Task.CompletedTask;
    }),
    ("VnpayPaymentGateway verifies the signature of the payment URL it created after the query is parsed", () =>
    {
        var gateway = new VnpayPaymentGateway(ValidVnpayGatewayOptions());
        var url = gateway.CreatePaymentUrl(VnpayTransaction(), "203.0.113.7");

        var parsed = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(new Uri(url).Query)
            .ToDictionary(p => p.Key, p => p.Value.ToString(), StringComparer.Ordinal);
        Check(parsed["vnp_OrderInfo"] == "Thanh toan lich hen ABC123def456"
                && parsed["vnp_ReturnUrl"] == "https://example.test/payments/vnpay/return",
            "Parsing must decode the values so that they are encoded again when verified.");
        Check(gateway.VerifyCallbackSignature(parsed), "The signature created by the adapter must verify after parsing.");

        parsed["vnp_Amount"] = "15000001";
        Check(!gateway.VerifyCallbackSignature(parsed), "A changed parameter must invalidate the signature.");
        return Task.CompletedTask;
    }),
    ("AddInfrastructure registers the VNPAY gateway lazily from Payment__Vnpay__* configuration", () =>
    {
        var baseSettings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:Default"] = "Host=localhost;Database=petspa;Username=test;Password=test",
            ["Jwt:SigningKey"] = "this-is-a-valid-32-byte-secret-key-12345",
            ["Jwt:AccessTokenMinutes"] = "15",
            ["Jwt:RefreshTokenDays"] = "7",
        };

        var withoutPayment = new ServiceCollection();
        PetSpa.Infrastructure.DependencyInjection.AddInfrastructure(
            withoutPayment, new ConfigurationBuilder().AddInMemoryCollection(baseSettings).Build());
        using var missingProvider = withoutPayment.BuildServiceProvider();
        using var missingScope = missingProvider.CreateScope();
        AssertThrows<InvalidOperationException>(
            () => missingScope.ServiceProvider.GetRequiredService<IPaymentGateway>(),
            "Resolving the gateway without Payment__Vnpay__* must fail, while registration must not.");

        var configured = new Dictionary<string, string?>(baseSettings)
        {
            ["Payment:Vnpay:TmnCode"] = "TESTCODE",
            ["Payment:Vnpay:HashSecret"] = "SANDBOXSECRETKEY0123456789ABCDEF",
            ["Payment:Vnpay:ReturnUrl"] = "https://example.test/payments/vnpay/return",
        };
        var withPayment = new ServiceCollection();
        PetSpa.Infrastructure.DependencyInjection.AddInfrastructure(
            withPayment, new ConfigurationBuilder().AddInMemoryCollection(configured).Build());
        using var provider = withPayment.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var gateway = scope.ServiceProvider.GetRequiredService<IPaymentGateway>();
        Check(gateway is VnpayPaymentGateway && gateway.Gateway == PaymentGateway.VNPAY,
            "The registered gateway must be the VNPAY adapter.");
        return Task.CompletedTask;
    }),
    ("PaymentService.StartOnlineAsync creates a transaction from the system amount and returns the gateway URL", async () =>
    {
        var ownerUserId = Guid.NewGuid();
        var payment = OnlinePayment(PaymentKind.Spa, 150000m);
        var repo = new TestPaymentRepo(new PaymentWithOwner(payment, AppointmentStatus.Completed, ownerUserId));
        var gateway = new TestPaymentGateway();
        var service = new PaymentService(repo, gateway, new TestConcurrencyGuard());

        var result = await service.StartOnlineAsync(
            new CurrentUser(ownerUserId, UserRole.Customer), payment.PaymentId, PaymentGateway.VNPAY, "203.0.113.7");

        Check(repo.Added.Count == 1, "Exactly one transaction must be stored.");
        var stored = repo.Added[0];
        Check(stored.PaymentId == payment.PaymentId && stored.Gateway == PaymentGateway.VNPAY,
            "The transaction must belong to the payment and the VNPAY gateway.");
        Check(stored.RequestedAmount == 150000m, "RequestedAmount must be the system amount of the payment.");
        Check(stored.TxnRef.Length == 32 && stored.TxnRef.All(char.IsAsciiHexDigitLower) && stored.TxnRef == stored.TxnId.ToString("N"),
            "TxnRef must be the 32-character lowercase hex form of TxnId.");
        Check(stored.Result is null && stored.ConfirmedAmount is null && stored.SignatureValid is null && stored.CallbackAt is null,
            "A new transaction must not carry any callback data.");
        Check(ReferenceEquals(gateway.LastTransaction, stored) && gateway.LastClientIp == "203.0.113.7",
            "The gateway must receive the stored transaction and the client IP.");
        Check(result.TxnRef == stored.TxnRef && result.PaymentUrl == gateway.Url,
            "The result must carry the stored TxnRef and the gateway URL.");
        Check(payment.Status == PaymentStatus.Unpaid && payment.Method is null && payment.PaidAt is null,
            "Starting an online payment must not change the payment.");
    }),
    ("PaymentService.StartOnlineAsync rejects non-customers, unsupported gateways, unknown and foreign payments", async () =>
    {
        var ownerUserId = Guid.NewGuid();
        var payment = OnlinePayment(PaymentKind.Spa, 150000m);
        var owned = new PaymentWithOwner(payment, AppointmentStatus.Completed, ownerUserId);
        var customer = new CurrentUser(ownerUserId, UserRole.Customer);

        async Task AssertPaymentRejectedAsync(PaymentWithOwner? found, CurrentUser user, Guid paymentId, PaymentGateway requested, string code)
        {
            var repo = new TestPaymentRepo(found);
            var gateway = new TestPaymentGateway();
            var service = new PaymentService(repo, gateway, new TestConcurrencyGuard());
            var threw = false;
            try
            {
                await service.StartOnlineAsync(user, paymentId, requested, "203.0.113.7");
            }
            catch (BusinessException ex) when (ex.Code == code)
            {
                threw = true;
            }

            Check(threw, $"Expected {code}.");
            Check(repo.Added.Count == 0 && gateway.Calls == 0, "A rejected request must not store a transaction or call the gateway.");
        }

        await AssertPaymentRejectedAsync(owned, new CurrentUser(ownerUserId, UserRole.Manager), payment.PaymentId, PaymentGateway.VNPAY, ErrorCodes.Forbidden);
        await AssertPaymentRejectedAsync(owned, new CurrentUser(ownerUserId, UserRole.Staff), payment.PaymentId, PaymentGateway.VNPAY, ErrorCodes.Forbidden);
        await AssertPaymentRejectedAsync(owned, customer, payment.PaymentId, PaymentGateway.MoMo, ErrorCodes.ValidationError);
        await AssertPaymentRejectedAsync(null, customer, Guid.NewGuid(), PaymentGateway.VNPAY, ErrorCodes.NotFound);
        await AssertPaymentRejectedAsync(owned, new CurrentUser(Guid.NewGuid(), UserRole.Customer), payment.PaymentId, PaymentGateway.VNPAY, ErrorCodes.Forbidden);
        await AssertPaymentRejectedAsync(
            new PaymentWithOwner(payment, AppointmentStatus.Completed, null), customer, payment.PaymentId, PaymentGateway.VNPAY, ErrorCodes.Forbidden);
    }),
    ("PaymentService.StartOnlineAsync rejects payments that cannot be paid online", async () =>
    {
        var ownerUserId = Guid.NewGuid();
        var customer = new CurrentUser(ownerUserId, UserRole.Customer);

        async Task AssertNotDueAsync(Payment payment, AppointmentStatus appointmentStatus)
        {
            var repo = new TestPaymentRepo(new PaymentWithOwner(payment, appointmentStatus, ownerUserId));
            var gateway = new TestPaymentGateway();
            var service = new PaymentService(repo, gateway, new TestConcurrencyGuard());
            var threw = false;
            try
            {
                await service.StartOnlineAsync(customer, payment.PaymentId, PaymentGateway.VNPAY, "203.0.113.7");
            }
            catch (BusinessException ex) when (ex.Code == ErrorCodes.PaymentNotDue)
            {
                threw = true;
            }

            Check(threw, $"{payment.Kind}/{payment.Status} with a {appointmentStatus} appointment must be rejected with PAYMENT_NOT_DUE.");
            Check(repo.Added.Count == 0 && gateway.Calls == 0, "A rejected request must not store a transaction or call the gateway.");
        }

        await AssertNotDueAsync(OnlinePayment(PaymentKind.Stay, 300000m), AppointmentStatus.Confirmed);
        await AssertNotDueAsync(OnlinePayment(PaymentKind.LateFee, 50000m), AppointmentStatus.InStay);
        foreach (var status in Enum.GetValues<AppointmentStatus>().Where(s => s != AppointmentStatus.Completed))
        {
            await AssertNotDueAsync(OnlinePayment(PaymentKind.Spa, 150000m), status);
        }

        var paid = OnlinePayment(PaymentKind.Spa, 150000m);
        paid.Status = PaymentStatus.Paid;
        await AssertNotDueAsync(paid, AppointmentStatus.Completed);
        await AssertNotDueAsync(OnlinePayment(PaymentKind.Spa, 0m), AppointmentStatus.Completed);
    }),
    ("PaymentService.StartOnlineAsync stores no transaction when the gateway fails", async () =>
    {
        var ownerUserId = Guid.NewGuid();
        var payment = OnlinePayment(PaymentKind.Spa, 150000m);
        var repo = new TestPaymentRepo(new PaymentWithOwner(payment, AppointmentStatus.Completed, ownerUserId));
        var service = new PaymentService(repo, new TestPaymentGateway { Failure = new InvalidOperationException("gateway") }, new TestConcurrencyGuard());

        var threw = false;
        try
        {
            await service.StartOnlineAsync(
                new CurrentUser(ownerUserId, UserRole.Customer), payment.PaymentId, PaymentGateway.VNPAY, "203.0.113.7");
        }
        catch (InvalidOperationException)
        {
            threw = true;
        }

        Check(threw, "The gateway failure must propagate unchanged.");
        Check(repo.Added.Count == 0, "No transaction may be stored when the URL could not be created.");
        Check(payment.Status == PaymentStatus.Unpaid, "The payment must stay unpaid.");
    }),
    ("OnlinePaymentRequestValidator requires a defined gateway", () =>
    {
        var validator = new OnlinePaymentRequestValidator();

        Check(validator.Validate(new OnlinePaymentRequest(PaymentGateway.VNPAY)).IsValid, "VNPAY must pass validation.");
        Check(validator.Validate(new OnlinePaymentRequest(PaymentGateway.MoMo)).IsValid,
            "MoMo is a defined gateway; whether it is supported is decided by the service.");

        var missing = validator.Validate(new OnlinePaymentRequest(null));
        Check(!missing.IsValid && missing.Errors.Any(e => e.PropertyName == "Gateway"), "A missing gateway must fail validation.");

        var undefined = validator.Validate(new OnlinePaymentRequest((PaymentGateway)99));
        Check(!undefined.IsValid && undefined.Errors.Any(e => e.PropertyName == "Gateway"), "An undefined gateway must fail validation.");
        return Task.CompletedTask;
    }),
    ("Online payment DTOs follow the JSON contract", () =>
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());

        var request = JsonSerializer.Deserialize<OnlinePaymentRequest>("{\"gateway\":\"VNPAY\"}", options);
        Check(request is { Gateway: PaymentGateway.VNPAY }, "gateway must bind from its enum name.");

        var json = JsonSerializer.Serialize(new OnlinePaymentCreated("https://pay.test/p?a=b", "abc123"), options);
        Check(json == "{\"paymentUrl\":\"https://pay.test/p?a=b\",\"txnRef\":\"abc123\"}",
            "The response must contain exactly paymentUrl and txnRef in camelCase.");
        return Task.CompletedTask;
    }),
    ("PaymentsController.PayOnline rejects null request with ValidationError", async () =>
    {
        var controller = new PaymentsController(new PaymentService(new TestPaymentRepo(null), new TestPaymentGateway(), new TestConcurrencyGuard()), NullLogger<PaymentsController>.Instance);

        var threw = false;
        try
        {
            await controller.PayOnline(Guid.NewGuid(), null, CancellationToken.None);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError)
        {
            threw = true;
        }

        Check(threw, "PayOnline must throw ValidationError when the request body is null.");
    }),
    ("PaymentsController.PayOnline returns paymentUrl and txnRef and passes the client IP to the gateway", async () =>
    {
        var ownerUserId = Guid.NewGuid();
        var payment = OnlinePayment(PaymentKind.Spa, 150000m);
        var repo = new TestPaymentRepo(new PaymentWithOwner(payment, AppointmentStatus.Completed, ownerUserId));
        var gateway = new TestPaymentGateway();

        async Task<IActionResult> CallAsync(System.Net.IPAddress remoteIp)
        {
            var httpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim(TokenClaims.UserId, ownerUserId.ToString()),
                    new Claim(TokenClaims.Role, "Customer"),
                ], "test")),
            };
            httpContext.Connection.RemoteIpAddress = remoteIp;
            var controller = new PaymentsController(new PaymentService(repo, gateway, new TestConcurrencyGuard()), NullLogger<PaymentsController>.Instance)
            {
                ControllerContext = new ControllerContext { HttpContext = httpContext },
            };
            return await controller.PayOnline(payment.PaymentId, new OnlinePaymentRequest(PaymentGateway.VNPAY), CancellationToken.None);
        }

        var ok = await CallAsync(System.Net.IPAddress.Parse("203.0.113.7")) as OkObjectResult;
        Check(ok?.Value is OnlinePaymentCreated, "PayOnline must return OnlinePaymentCreated with 200.");
        var body = (OnlinePaymentCreated)ok!.Value!;
        Check(body.PaymentUrl == gateway.Url && body.TxnRef == repo.Added[0].TxnRef, "The body must carry the gateway URL and the stored TxnRef.");
        Check(gateway.LastClientIp == "203.0.113.7", "The remote IP must be passed to the gateway.");

        await CallAsync(System.Net.IPAddress.Parse("::ffff:203.0.113.8"));
        Check(gateway.LastClientIp == "203.0.113.8", "An IPv4-mapped IPv6 address must be passed as IPv4.");

        await CallAsync(System.Net.IPAddress.IPv6Loopback);
        Check(gateway.LastClientIp == "127.0.0.1", "An IPv6 loopback address (::1) must be normalized to 127.0.0.1.");
    }),
    ("HotelBookingService.GetAvailabilityAsync returns availability, nights and the estimated amount from server pricing", async () =>
    {
        var ownerUserId = Guid.NewGuid();
        var pet = new Pet { PetId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), Species = Species.Cat, SizeGroup = SizeGroup.Small, IsActive = true };
        var catalog = new TestHotelCatalogRepo
        {
            Prices = [new HotelPricing { Species = Species.Cat, SizeGroup = SizeGroup.Small, PricePerNight = 100000m, FoodPerNight = 20000m }],
        };
        var checkIn = new DateTimeOffset(2026, 11, 10, 14, 0, 0, TimeSpan.Zero);
        var checkOut = new DateTimeOffset(2026, 11, 12, 12, 0, 0, TimeSpan.Zero);
        var user = new CurrentUser(ownerUserId, UserRole.Customer);

        HotelBookingService ServiceFor(int activeCages) => new(
            new TestPetRepo(pet, ownerUserId),
            new TestStaffRoleReader(null),
            new TestHotelBookingRepo(activeCages, []),
            catalog,
            new ShopTimeZone(TimeZoneInfo.Utc),
            new TestConcurrencyGuard(),
            NoNotifier());

        var open = await ServiceFor(1).GetAvailabilityAsync(user, pet.PetId, checkIn, checkOut);
        var full = await ServiceFor(0).GetAvailabilityAsync(user, pet.PetId, checkIn, checkOut);

        Check(open.Available, "One free cage must be reported as available.");
        Check(open.Nights == 2, "10/11 to 12/11 must count 2 nights.");
        Check(open.EstimatedAmount == 240000m, "The amount must be nights x (price per night + food per night).");
        Check(!full.Available && full.Nights == 2 && full.EstimatedAmount == 240000m,
            "Without a free cage the result must be unavailable but still carry nights and amount.");
    }),
    ("HotelAvailabilityQueryValidator requires from, to and petId", () =>
    {
        var validator = new HotelAvailabilityQueryValidator();

        var valid = validator.Validate(new HotelAvailabilityQuery
        {
            From = DateTimeOffset.UtcNow.AddDays(1),
            To = DateTimeOffset.UtcNow.AddDays(3),
            PetId = Guid.NewGuid(),
        });
        Check(valid.IsValid, "A complete query must pass validation.");

        var empty = validator.Validate(new HotelAvailabilityQuery());
        Check(!empty.IsValid
            && empty.Errors.Any(e => e.PropertyName == "From")
            && empty.Errors.Any(e => e.PropertyName == "To")
            && empty.Errors.Any(e => e.PropertyName == "PetId"),
            "Missing From, To and PetId must fail validation.");

        var emptyPet = validator.Validate(new HotelAvailabilityQuery
        {
            From = DateTimeOffset.UtcNow.AddDays(1),
            To = DateTimeOffset.UtcNow.AddDays(3),
            PetId = Guid.Empty,
        });
        Check(!emptyPet.IsValid && emptyPet.Errors.Any(e => e.PropertyName == "PetId"),
            "An empty PetId must fail validation.");

        return Task.CompletedTask;
    }),
    ("HotelBookingService.CreateHotelAppointmentAsync creates a Pending stay from the pet data for the owner and for a receptionist", async () =>
    {
        var ownerUserId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var pet = new Pet { PetId = Guid.NewGuid(), CustomerId = customerId, Species = Species.Cat, SizeGroup = SizeGroup.Small, IsActive = true };
        var catalog = new TestHotelCatalogRepo
        {
            Prices = [new HotelPricing { Species = Species.Cat, SizeGroup = SizeGroup.Small, PricePerNight = 100000m, FoodPerNight = 20000m }],
        };
        var repo = new TestHotelBookingRepo(1, []);
        var guard = new TestConcurrencyGuard();

        HotelBookingService ServiceFor(StaffRole? staffRole) => new(
            new TestPetRepo(pet, ownerUserId),
            new TestStaffRoleReader(staffRole),
            repo,
            catalog,
            new ShopTimeZone(TimeZoneInfo.Utc),
            guard,
            NoNotifier());

        var futureDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2));
        var checkIn = new DateTimeOffset(futureDate.ToDateTime(new TimeOnly(14, 0)), TimeSpan.Zero);
        var checkOut = checkIn.AddDays(2);

        var byOwner = await ServiceFor(null).CreateHotelAppointmentAsync(
            new CurrentUser(ownerUserId, UserRole.Customer), null, pet.PetId, checkIn, checkOut);
        var byReceptionist = await ServiceFor(StaffRole.Receptionist).CreateHotelAppointmentAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Staff), customerId, pet.PetId, checkIn, checkOut);

        Check(repo.AddedAppointments.Count == 2, "Each successful request must save one stay.");
        Check(guard.LockedHotelGroup == (Species.Cat, SizeGroup.Small),
            "CreateHotelAppointmentAsync must acquire advisory lock for the pet's species and size group.");

        var created = byOwner.Appointment;
        Check(created.Status == AppointmentStatus.Pending, "A new stay must be Pending.");
        Check(created.CustomerId == customerId && created.PetId == pet.PetId && created.SizeGroup == SizeGroup.Small,
            "Customer, pet and size group must come from the pet record.");
        Check(created.PlannedCheckIn.Offset == TimeSpan.Zero && created.PlannedCheckOut.Offset == TimeSpan.Zero,
            "Planned times must be stored in UTC.");
        Check(created.CageId is null, "A Pending stay must not have a cage yet.");
        Check(byOwner.Nights == 2 && byOwner.EstimatedAmount == 240000m,
            "The result must carry the server-calculated nights and amount.");
        Check(byReceptionist.Appointment.CustomerId == customerId,
            "A stay booked by a receptionist must belong to the pet's customer.");
    }),
    ("HotelBookingService.CreateHotelAppointmentAsync rejects wrong actors, customer mismatch, unknown or inactive pet, same-day stay and full capacity without saving", async () =>
    {
        var ownerUserId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var pet = new Pet { PetId = Guid.NewGuid(), CustomerId = customerId, Species = Species.Cat, SizeGroup = SizeGroup.Small, IsActive = true };
        var inactivePet = new Pet { PetId = Guid.NewGuid(), CustomerId = customerId, Species = Species.Cat, SizeGroup = SizeGroup.Small, IsActive = false };
        var catalog = new TestHotelCatalogRepo
        {
            Prices = [new HotelPricing { Species = Species.Cat, SizeGroup = SizeGroup.Small, PricePerNight = 100000m, FoodPerNight = 20000m }],
        };
        var openRepo = new TestHotelBookingRepo(1, []);
        var fullRepo = new TestHotelBookingRepo(0, []);

        HotelBookingService ServiceFor(Pet target, StaffRole? staffRole, TestHotelBookingRepo repository) => new(
            new TestPetRepo(target, ownerUserId),
            new TestStaffRoleReader(staffRole),
            repository,
            catalog,
            new ShopTimeZone(TimeZoneInfo.Utc),
            new TestConcurrencyGuard(),
            NoNotifier());

        async Task<string?> CodeOfAsync(Func<Task> action)
        {
            try
            {
                await action();
                return null;
            }
            catch (BusinessException ex)
            {
                return ex.Code;
            }
        }

        var owner = new CurrentUser(ownerUserId, UserRole.Customer);
        var receptionist = new CurrentUser(Guid.NewGuid(), UserRole.Staff);
        var futureDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2));
        var checkIn = new DateTimeOffset(futureDate.ToDateTime(new TimeOnly(14, 0)), TimeSpan.Zero);
        var checkOut = checkIn.AddDays(2);

        var otherCustomer = await CodeOfAsync(() => ServiceFor(pet, null, openRepo).CreateHotelAppointmentAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Customer), null, pet.PetId, checkIn, checkOut));
        var spaStaff = await CodeOfAsync(() => ServiceFor(pet, StaffRole.SpaStaff, openRepo).CreateHotelAppointmentAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Staff), customerId, pet.PetId, checkIn, checkOut));
        var manager = await CodeOfAsync(() => ServiceFor(pet, null, openRepo).CreateHotelAppointmentAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Manager), customerId, pet.PetId, checkIn, checkOut));
        var noCustomerId = await CodeOfAsync(() => ServiceFor(pet, StaffRole.Receptionist, openRepo).CreateHotelAppointmentAsync(
            receptionist, null, pet.PetId, checkIn, checkOut));
        var wrongCustomerId = await CodeOfAsync(() => ServiceFor(pet, StaffRole.Receptionist, openRepo).CreateHotelAppointmentAsync(
            receptionist, Guid.NewGuid(), pet.PetId, checkIn, checkOut));
        var unknownPet = await CodeOfAsync(() => ServiceFor(pet, null, openRepo).CreateHotelAppointmentAsync(
            owner, null, Guid.NewGuid(), checkIn, checkOut));
        var inactive = await CodeOfAsync(() => ServiceFor(inactivePet, null, openRepo).CreateHotelAppointmentAsync(
            owner, null, inactivePet.PetId, checkIn, checkOut));
        var sameDay = await CodeOfAsync(() => ServiceFor(pet, null, openRepo).CreateHotelAppointmentAsync(
            owner, null, pet.PetId, checkIn, checkIn.AddHours(6)));
        var pastCheckIn = await CodeOfAsync(() => ServiceFor(pet, null, openRepo).CreateHotelAppointmentAsync(
            owner, null, pet.PetId, DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(1)));
        var noCapacity = await CodeOfAsync(() => ServiceFor(pet, null, fullRepo).CreateHotelAppointmentAsync(
            owner, null, pet.PetId, checkIn, checkOut));

        var lockedRepo = new TestHotelBookingRepo(1, []) { IsLocked = true };
        var lockedCustomer = await CodeOfAsync(() => ServiceFor(pet, null, lockedRepo).CreateHotelAppointmentAsync(
            owner, null, pet.PetId, checkIn, checkOut));
        var receptionistForLocked = await ServiceFor(pet, StaffRole.Receptionist, lockedRepo).CreateHotelAppointmentAsync(
            receptionist, customerId, pet.PetId, checkIn, checkOut);

        Check(otherCustomer == ErrorCodes.Forbidden, "A customer must not book for another customer's pet.");
        Check(spaStaff == ErrorCodes.Forbidden, "Spa staff must be rejected with Forbidden.");
        Check(manager == ErrorCodes.Forbidden, "A manager must be rejected with Forbidden.");
        Check(noCustomerId == ErrorCodes.ValidationError, "A receptionist without customerId must be rejected with ValidationError.");
        Check(wrongCustomerId == ErrorCodes.ValidationError, "A customerId that does not own the pet must be rejected with ValidationError.");
        Check(unknownPet == ErrorCodes.NotFound, "An unknown pet must be rejected with NotFound.");
        Check(inactive == ErrorCodes.NotFound, "An inactive pet must be rejected with NotFound.");
        Check(sameDay == ErrorCodes.ValidationError, "A check-out on the check-in date must be rejected with ValidationError.");
        Check(pastCheckIn == ErrorCodes.ValidationError, "A check-in in the past must be rejected with ValidationError.");
        Check(noCapacity == ErrorCodes.NoCapacity, "No free cage must be rejected with NoCapacity.");
        Check(lockedCustomer == ErrorCodes.BookingLocked, "A locked customer must be rejected with BookingLocked.");
        Check(receptionistForLocked.Appointment.Status == AppointmentStatus.Pending,
            "A receptionist can book for a customer even when customer is booking locked.");
        Check(openRepo.AddedAppointments.Count == 0 && fullRepo.AddedAppointments.Count == 0 && lockedRepo.AddedAppointments.Count == 1,
            "Rejected requests must not save any stay.");
    }),
    ("HotelBookingRequestValidator requires petId, plannedCheckIn and plannedCheckOut", () =>
    {
        var validator = new HotelBookingRequestValidator();
        var checkIn = DateTimeOffset.UtcNow.AddDays(1);
        var checkOut = DateTimeOffset.UtcNow.AddDays(3);

        var valid = validator.Validate(new HotelBookingRequest(Guid.NewGuid(), checkIn, checkOut, null));
        Check(valid.IsValid, "A complete request must pass validation.");

        var missingPet = validator.Validate(new HotelBookingRequest(null, checkIn, checkOut, null));
        Check(!missingPet.IsValid && missingPet.Errors.Any(e => e.PropertyName == "PetId"),
            "Missing PetId must fail validation.");

        var emptyPet = validator.Validate(new HotelBookingRequest(Guid.Empty, checkIn, checkOut, null));
        Check(!emptyPet.IsValid && emptyPet.Errors.Any(e => e.PropertyName == "PetId"),
            "An empty PetId must fail validation.");

        var missingDates = validator.Validate(new HotelBookingRequest(Guid.NewGuid(), null, null, null));
        Check(!missingDates.IsValid
            && missingDates.Errors.Any(e => e.PropertyName == "PlannedCheckIn")
            && missingDates.Errors.Any(e => e.PropertyName == "PlannedCheckOut"),
            "Missing check-in and check-out must fail validation.");

        var pastCheckIn = validator.Validate(new HotelBookingRequest(
            Guid.NewGuid(), DateTimeOffset.UtcNow.AddDays(-1), checkOut, null));
        Check(!pastCheckIn.IsValid && pastCheckIn.Errors.Any(e => e.PropertyName == "PlannedCheckIn"),
            "Past plannedCheckIn must fail validation.");

        return Task.CompletedTask;
    }),
    ("AppointmentsController.CreateHotel rejects null request with ValidationError", async () =>
    {
        var controller = new AppointmentsController(null!);
        var threw = false;
        try
        {
            await controller.CreateHotel(null, CancellationToken.None);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError)
        {
            threw = true;
        }

        Check(threw, "Controller must throw BusinessException(ValidationError) when request is null.");
    }),
    ("AppointmentsController.CreateHotel has RateLimitPolicies.Booking attribute", () =>
    {
        var method = typeof(AppointmentsController).GetMethod(nameof(AppointmentsController.CreateHotel));
        var rateLimitAttr = method?.GetCustomAttributes(typeof(EnableRateLimitingAttribute), true)
            .OfType<EnableRateLimitingAttribute>()
            .FirstOrDefault();
        Check(rateLimitAttr is not null && rateLimitAttr.PolicyName == RateLimitPolicies.Booking,
            "CreateHotel must have [EnableRateLimiting(RateLimitPolicies.Booking)].");
        return Task.CompletedTask;
    }),
    ("PaymentService.VerifyIpnSignature passes the parameters to the gateway and rejects an invalid signature", () =>
    {
        var payment = OnlinePayment(PaymentKind.Spa, 150000m);
        var repo = new TestPaymentRepo(new PaymentWithOwner(payment, AppointmentStatus.Completed, Guid.NewGuid()));
        var parameters = new Dictionary<string, string> { ["vnp_TxnRef"] = "ABC123def456" };

        var accepting = new TestPaymentGateway { CallbackSignatureValid = true };
        var valid = new PaymentService(repo, accepting, new TestConcurrencyGuard()).VerifyIpnSignature(parameters);
        Check(valid, "A valid signature must return true.");
        Check(accepting.VerifyCalls == 1 && ReferenceEquals(accepting.LastCallback, parameters),
            "The parameters must reach the gateway unchanged.");

        var invalid = new PaymentService(repo, new TestPaymentGateway(), new TestConcurrencyGuard()).VerifyIpnSignature(parameters);
        Check(!invalid, "An invalid signature must return false.");
        Check(repo.Added.Count == 0 && payment.Status == PaymentStatus.Unpaid && payment.Method is null && payment.PaidAt is null,
            "A webhook must not store a transaction or change the payment.");
        return Task.CompletedTask;
    }),
    ("PaymentService.ProcessCallbackAsync pays the payment online and records the callback on the transaction", async () =>
    {
        var target = CallbackTarget();
        var events = new List<string>();
        var repo = new TestPaymentRepo(null, target) { Events = events };
        var guard = new TestConcurrencyGuard { Events = events };
        var gateway = new TestPaymentGateway { Callback = SuccessCallback(target) };
        var service = new PaymentService(repo, gateway, guard);

        var result = await service.ProcessCallbackAsync(new Dictionary<string, string>());

        Check(result.Status == PaymentCallbackStatus.Paid, "A signed, successful, exact-amount callback must pay the payment.");
        Check(result.TxnRef == target.Transaction.TxnRef && result.PaymentId == target.Payment.PaymentId
                && result.ExpectedAmount == 150000m && result.ConfirmedAmount == 150000m,
            "The result must carry the TxnRef, the payment and both amounts.");
        var payment = target.Payment;
        Check(payment.Status == PaymentStatus.Paid && payment.Method == PaymentMethod.Online
                && payment.ReceivedAmount == 150000m && payment.PaidAt is not null && payment.ConfirmedByUserId is null,
            "The payment must be Paid online with the received amount and no confirmer.");
        var transaction = target.Transaction;
        Check(transaction.Result == TransactionResult.Success && transaction.ConfirmedAmount == 150000m
                && transaction.SignatureValid == true && transaction.CallbackAt is not null,
            "The callback must be recorded on the transaction.");
        Check(guard.LockedPaymentId == payment.PaymentId, "The Payment row must be locked.");
        Check(events.SequenceEqual(new[] { "find-id", "run", "lock-payment", "find-target", "save" }),
            $"The target must be read inside the transaction after the lock and saved once, got: {string.Join(",", events)}.");
    }),
    ("PaymentService.ProcessCallbackAsync rejects an amount that differs from the payment amount and changes nothing", async () =>
    {
        foreach (var confirmed in new[] { 149000m, 150001m })
        {
            var target = CallbackTarget();
            var repo = new TestPaymentRepo(null, target);
            var gateway = new TestPaymentGateway { Callback = SuccessCallback(target, confirmed) };
            var service = new PaymentService(repo, gateway, new TestConcurrencyGuard());

            var result = await service.ProcessCallbackAsync(new Dictionary<string, string>());

            Check(result.Status == PaymentCallbackStatus.AmountMismatch
                    && result.ExpectedAmount == 150000m && result.ConfirmedAmount == confirmed,
                $"{confirmed} must be reported as an amount mismatch with both amounts.");
            var payment = target.Payment;
            Check(payment.Status == PaymentStatus.Unpaid && payment.Method is null
                    && payment.ReceivedAmount is null && payment.PaidAt is null,
                "A mismatching amount must leave the payment unpaid.");
            var transaction = target.Transaction;
            Check(transaction.Result is null && transaction.ConfirmedAmount is null
                    && transaction.SignatureValid is null && transaction.CallbackAt is null,
                "A mismatching amount must leave the transaction untouched.");
            Check(repo.SaveCalls == 0, "Nothing may be saved.");
        }
    }),
    ("PaymentService.ProcessCallbackAsync records a failed gateway result without paying and still accepts a later success", async () =>
    {
        var target = CallbackTarget();
        var repo = new TestPaymentRepo(null, target);
        var guard = new TestConcurrencyGuard();

        var failed = await new PaymentService(repo, new TestPaymentGateway { Callback = SuccessCallback(target, succeeded: false) }, guard)
            .ProcessCallbackAsync(new Dictionary<string, string>());

        Check(failed.Status == PaymentCallbackStatus.Failed, "A failed gateway result must be reported as Failed.");
        Check(target.Payment.Status == PaymentStatus.Unpaid && target.Payment.PaidAt is null,
            "A failed gateway result must leave the payment unpaid.");
        Check(target.Transaction.Result == TransactionResult.Failed && target.Transaction.ConfirmedAmount == 150000m
                && target.Transaction.SignatureValid == true && target.Transaction.CallbackAt is not null,
            "A failed gateway result must be recorded on the transaction.");
        Check(repo.SaveCalls == 1, "The failed result must be saved once.");

        var repeatedFailed = await new PaymentService(repo, new TestPaymentGateway { Callback = SuccessCallback(target, succeeded: false) }, guard)
            .ProcessCallbackAsync(new Dictionary<string, string>());
        Check(repeatedFailed.Status == PaymentCallbackStatus.Failed && repo.SaveCalls == 1,
            "A repeated failed callback must not re-save.");

        var paid = await new PaymentService(repo, new TestPaymentGateway { Callback = SuccessCallback(target) }, guard)
            .ProcessCallbackAsync(new Dictionary<string, string>());

        Check(paid.Status == PaymentCallbackStatus.Paid && target.Payment.Status == PaymentStatus.Paid
                && target.Transaction.Result == TransactionResult.Success,
            "A later successful callback for the same TxnRef must still pay the payment.");
    }),
    ("PaymentService.ProcessCallbackAsync ignores a callback repeated after the payment succeeded", async () =>
    {
        var target = CallbackTarget();
        var repo = new TestPaymentRepo(null, target);
        var service = new PaymentService(repo, new TestPaymentGateway { Callback = SuccessCallback(target) }, new TestConcurrencyGuard());

        await service.ProcessCallbackAsync(new Dictionary<string, string>());
        var paidAt = target.Payment.PaidAt;
        var callbackAt = target.Transaction.CallbackAt;

        var repeated = await service.ProcessCallbackAsync(new Dictionary<string, string>());

        Check(repeated.Status == PaymentCallbackStatus.AlreadyProcessed, "A repeated callback must be reported as already processed.");
        Check(target.Payment.PaidAt == paidAt && target.Transaction.CallbackAt == callbackAt && repo.SaveCalls == 1,
            "A repeated callback must not change or save anything.");
    }),
    ("PaymentService.ProcessCallbackAsync does not overwrite a payment already settled at the counter", async () =>
    {
        var target = CallbackTarget();
        var cashier = Guid.NewGuid();
        target.Payment.MarkPaid(AppointmentStatus.Completed, 150000m, PaymentMethod.Cash, cashier);
        var repo = new TestPaymentRepo(null, target);
        var service = new PaymentService(repo, new TestPaymentGateway { Callback = SuccessCallback(target) }, new TestConcurrencyGuard());

        var result = await service.ProcessCallbackAsync(new Dictionary<string, string>());

        Check(result.Status == PaymentCallbackStatus.AlreadyProcessed, "A payment that is no longer unpaid must be reported as already processed.");
        Check(target.Payment.Method == PaymentMethod.Cash && target.Payment.ConfirmedByUserId == cashier,
            "The counter payment must be kept.");
        Check(target.Transaction.Result is null && repo.SaveCalls == 0, "Nothing may be recorded or saved.");
    }),
    ("PaymentService.ProcessCallbackAsync reports an unknown TxnRef without opening a transaction", async () =>
    {
        var target = CallbackTarget();
        var events = new List<string>();
        var repo = new TestPaymentRepo(null, target) { Events = events };
        var guard = new TestConcurrencyGuard { Events = events };
        var gateway = new TestPaymentGateway { Callback = new GatewayCallback("UNKNOWN0001", 150000m, true) };

        var result = await new PaymentService(repo, gateway, guard).ProcessCallbackAsync(new Dictionary<string, string>());

        Check(result.Status == PaymentCallbackStatus.TxnNotFound && result.TxnRef == "UNKNOWN0001",
            "An unknown TxnRef must be reported as not found.");
        Check(events.SequenceEqual(new[] { "find-id" }) && target.Payment.Status == PaymentStatus.Unpaid,
            "No transaction, lock or write may happen for an unknown TxnRef.");
    }),
    ("PaymentService.ProcessCallbackAsync reports an unreadable callback without touching the repository", async () =>
    {
        var target = CallbackTarget();
        var events = new List<string>();
        var repo = new TestPaymentRepo(null, target) { Events = events };
        var guard = new TestConcurrencyGuard { Events = events };

        var result = await new PaymentService(repo, new TestPaymentGateway(), guard)
            .ProcessCallbackAsync(new Dictionary<string, string>());

        Check(result.Status == PaymentCallbackStatus.Malformed, "An unreadable callback must be reported as malformed.");
        Check(events.Count == 0, "The repository and the guard must not be used.");
    }),
    ("PaymentsController.VnpayIpn is an anonymous GET endpoint at ipn/vnpay", () =>
    {
        var action = typeof(PaymentsController).GetMethod(nameof(PaymentsController.VnpayIpn))!;

        var get = action.GetCustomAttributes(typeof(HttpGetAttribute), false).Cast<HttpGetAttribute>().Single();
        Check(get.Template == "ipn/vnpay", "The webhook route must be ipn/vnpay under api/v1/payments.");
        Check(action.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AllowAnonymousAttribute), false).Length == 1,
            "The webhook must be anonymous.");
        Check(action.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), false).Length == 0
                && typeof(PaymentsController).GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), true).Length == 0,
            "No authorization requirement may apply to the webhook.");
        return Task.CompletedTask;
    }),
    ("PaymentsController.VnpayIpn confirms a successful payment with RspCode 00 and logs it", async () =>
    {
        var target = CallbackTarget();
        var repo = new TestPaymentRepo(null, target);
        var gateway = new TestPaymentGateway { CallbackSignatureValid = true, Callback = SuccessCallback(target) };
        var logger = new CapturingLogger<PaymentsController>();
        var controller = IpnController(gateway, repo, "?vnp_TxnRef=ABC123def456&vnp_OrderInfo=Thanh+toan+lich+hen&dup=1&dup=2", logger);

        var body = ((await controller.VnpayIpn(CancellationToken.None)) as OkObjectResult)?.Value as VnpayIpnResponse;

        Check(body is { RspCode: "00", Message: "Confirm Success" }, "A paid callback must be answered with RspCode 00.");
        Check(gateway.LastCallback is { Count: 3 }
                && gateway.LastCallback["vnp_TxnRef"] == "ABC123def456"
                && gateway.LastCallback["vnp_OrderInfo"] == "Thanh toan lich hen"
                && gateway.LastCallback["dup"] == "1,2",
            "The decoded query must reach the gateway, repeated keys joined by a comma.");
        Check(target.Payment.Status == PaymentStatus.Paid && target.Payment.Method == PaymentMethod.Online,
            "The payment must be Paid online.");
        Check(logger.Entries.Count == 1 && logger.Entries[0].Level == Microsoft.Extensions.Logging.LogLevel.Information
                && logger.Entries[0].Message.Contains(target.Transaction.TxnRef)
                && logger.Entries[0].Message.Contains(target.Payment.PaymentId.ToString()),
            "One information entry with the TxnRef and the payment must be logged.");
    }),
    ("PaymentsController.VnpayIpn answers an invalid signature with 200 InvalidChecksum, logs the rejection and processes nothing", async () =>
    {
        var target = CallbackTarget();
        var events = new List<string>();
        var repo = new TestPaymentRepo(null, target) { Events = events };
        var gateway = new TestPaymentGateway { Callback = SuccessCallback(target) };
        var logger = new CapturingLogger<PaymentsController>();
        var controller = IpnController(gateway, repo, "?vnp_TxnRef=ABC123def456&vnp_SecureHash=invalid", logger);

        var result = await controller.VnpayIpn(CancellationToken.None) as OkObjectResult;

        Check(result is not null && result.StatusCode == 200, "An invalid signature must return HTTP 200 OK according to VNPAY IPN specification.");
        var body = result!.Value as VnpayIpnResponse;
        Check(body is { RspCode: "97", Message: "Invalid Checksum" }, "The response must contain RspCode 97 and Invalid Checksum message.");
        Check(gateway.ReadCalls == 0 && events.Count == 0, "A rejected webhook must not be read or processed.");
        Check(target.Payment.Status == PaymentStatus.Unpaid && target.Transaction.Result is null,
            "A rejected webhook must leave the payment and the transaction unchanged.");
        Check(logger.Entries.Count == 1 && logger.Entries[0].Level == Microsoft.Extensions.Logging.LogLevel.Warning
                && logger.Entries[0].Message.Contains("127.0.0.1")
                && !logger.Entries[0].Message.Contains("invalid"),
            "One warning with the client IP and without the received hash must be logged.");
    }),
    ("PaymentsController.VnpayIpn answers an amount mismatch with RspCode 04 and logs both amounts", async () =>
    {
        var target = CallbackTarget();
        var repo = new TestPaymentRepo(null, target);
        var gateway = new TestPaymentGateway { CallbackSignatureValid = true, Callback = SuccessCallback(target, 149000m) };
        var logger = new CapturingLogger<PaymentsController>();
        var controller = IpnController(gateway, repo, "?vnp_TxnRef=ABC123def456", logger);

        var body = ((await controller.VnpayIpn(CancellationToken.None)) as OkObjectResult)?.Value as VnpayIpnResponse;

        Check(body is { RspCode: "04", Message: "Invalid amount" }, "An amount mismatch must be answered with RspCode 04.");
        Check(target.Payment.Status == PaymentStatus.Unpaid && repo.SaveCalls == 0, "The payment must stay unpaid and nothing saved.");
        Check(logger.Entries.Count == 1 && logger.Entries[0].Level == Microsoft.Extensions.Logging.LogLevel.Warning
                && logger.Entries[0].Message.Contains("150000") && logger.Entries[0].Message.Contains("149000"),
            "One warning with the expected and the confirmed amount must be logged.");
    }),
    ("PaymentsController.VnpayIpn catches unexpected exception, logs error and returns 200 with RspCode 99", async () =>
    {
        var target = CallbackTarget();
        var gateway = new TestPaymentGateway { CallbackSignatureValid = true, Callback = SuccessCallback(target) };
        var logger = new CapturingLogger<PaymentsController>();
        var failingService = new PaymentService(null!, gateway, new TestConcurrencyGuard());
        var controller = new PaymentsController(failingService, logger)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { Request = { QueryString = new QueryString("?vnp_TxnRef=ABC123def456") } },
            },
        };

        var result = await controller.VnpayIpn(CancellationToken.None) as OkObjectResult;

        Check(result is not null && result.StatusCode == 200, "An unexpected exception must return HTTP 200 OK.");
        var body = result!.Value as VnpayIpnResponse;
        Check(body is { RspCode: "99", Message: "Unknown error" }, "The response must contain RspCode 99.");
        Check(logger.Entries.Count == 1 && logger.Entries[0].Level == Microsoft.Extensions.Logging.LogLevel.Error,
            "An error entry must be logged.");
    }),
    ("VnpayIpnResponse.From maps every callback status to its VNPAY response", () =>
    {
        Check(VnpayIpnResponse.From(PaymentCallbackStatus.Paid) == VnpayIpnResponse.Confirmed, "Paid must map to 00.");
        Check(VnpayIpnResponse.From(PaymentCallbackStatus.Failed) == VnpayIpnResponse.Confirmed, "Failed must map to 00.");
        Check(VnpayIpnResponse.From(PaymentCallbackStatus.AlreadyProcessed) == VnpayIpnResponse.AlreadyConfirmed, "AlreadyProcessed must map to 02.");
        Check(VnpayIpnResponse.From(PaymentCallbackStatus.TxnNotFound) == VnpayIpnResponse.OrderNotFound, "TxnNotFound must map to 01.");
        Check(VnpayIpnResponse.From(PaymentCallbackStatus.AmountMismatch) == VnpayIpnResponse.InvalidAmount, "AmountMismatch must map to 04.");
        Check(VnpayIpnResponse.From(PaymentCallbackStatus.Malformed) == VnpayIpnResponse.Unprocessed, "Malformed must map to 99.");
        return Task.CompletedTask;
    }),
    ("VnpayIpnResponse follows the VNPAY JSON contract", () =>
    {
        var web = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        Check(JsonSerializer.Serialize(VnpayIpnResponse.Confirmed, web) == "{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}", "The confirmed response must use RspCode 00.");
        Check(JsonSerializer.Serialize(VnpayIpnResponse.OrderNotFound, web) == "{\"RspCode\":\"01\",\"Message\":\"Order not found\"}", "The not found response must use RspCode 01.");
        Check(JsonSerializer.Serialize(VnpayIpnResponse.AlreadyConfirmed, web) == "{\"RspCode\":\"02\",\"Message\":\"Order already confirmed\"}", "The already confirmed response must use RspCode 02.");
        Check(JsonSerializer.Serialize(VnpayIpnResponse.InvalidAmount, web) == "{\"RspCode\":\"04\",\"Message\":\"Invalid amount\"}", "The invalid amount response must use RspCode 04.");
        Check(JsonSerializer.Serialize(VnpayIpnResponse.InvalidChecksum, web) == "{\"RspCode\":\"97\",\"Message\":\"Invalid Checksum\"}", "The invalid checksum response must use RspCode 97.");
        Check(JsonSerializer.Serialize(VnpayIpnResponse.Unprocessed, web) == "{\"RspCode\":\"99\",\"Message\":\"Unknown error\"}", "The unprocessed response must use RspCode 99.");
        return Task.CompletedTask;
    }),
    ("BookingService.PlanSpaSlotAsync computes the hold window and EnsureSpaSlotAvailableAsync forwards the excluded appointment", async () =>
    {
        var scenario = CreateSpaSlotScenario(slotIsHeld: false);
        var selection = await scenario.Service.ResolveSpaSelectionAsync(scenario.User, scenario.PetId, [scenario.ServiceId]);
        var plan = await scenario.Service.PlanSpaSlotAsync(selection, scenario.SlotStart);
        var excludedId = Guid.NewGuid();

        await scenario.Service.EnsureSpaSlotAvailableAsync(selection, plan, excludedId);

        Check(plan.SlotStart == scenario.SlotStart, "The plan must keep the requested start in UTC.");
        Check(plan.SlotEnd == scenario.SlotStart.AddMinutes(60), "SlotEnd must add the service duration.");
        Check(plan.BusyUntil == scenario.SlotStart.AddMinutes(75), "BusyUntil must add the buffer after SlotEnd.");
        Check(plan.BufferMinutes == 15 && plan.LocalTime == new TimeOnly(10, 0), "The plan must carry the buffer and the local time.");
        Check(scenario.Schedule.LastExcludeAppointmentId == excludedId,
            "The held bookings query must receive the excluded appointment id.");
    }),
    ("BookingService.EnsureSpaSlotAvailableAsync throws SLOT_FULL when the slot is already held", async () =>
    {
        var scenario = CreateSpaSlotScenario(slotIsHeld: true);
        var selection = await scenario.Service.ResolveSpaSelectionAsync(scenario.User, scenario.PetId, [scenario.ServiceId]);
        var plan = await scenario.Service.PlanSpaSlotAsync(selection, scenario.SlotStart);

        var threw = false;
        try
        {
            await scenario.Service.EnsureSpaSlotAvailableAsync(selection, plan, null);
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.SlotFull)
        {
            threw = true;
        }

        Check(threw, "A held slot must be rejected with SLOT_FULL.");
    }),
    ("BookingService.PlanSpaSlotAsync rejects past slots and slots that are not a configured slot time", async () =>
    {
        var scenario = CreateSpaSlotScenario(slotIsHeld: false);
        var selection = await scenario.Service.ResolveSpaSelectionAsync(scenario.User, scenario.PetId, [scenario.ServiceId]);

        foreach (var invalidStart in new[] { DateTimeOffset.UtcNow.AddHours(-1), scenario.SlotStart.AddMinutes(30) })
        {
            var threw = false;
            try
            {
                await scenario.Service.PlanSpaSlotAsync(selection, invalidStart);
            }
            catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError)
            {
                threw = true;
            }

            Check(threw, "An invalid slot start must be rejected with VALIDATION_ERROR.");
        }
    }),
    ("HotelBookingService.HasCapacityForGroupAsync forwards the excluded appointment and counts held nights", async () =>
    {
        var held = new[]
        {
            new HeldHotelStay(new DateTimeOffset(2026, 11, 11, 7, 0, 0, TimeSpan.Zero), new DateTimeOffset(2026, 11, 13, 5, 0, 0, TimeSpan.Zero)),
        };
        var repo = new TestHotelBookingRepo(1, held);
        var service = new HotelBookingService(
            new TestPetRepo(new Pet { PetId = Guid.NewGuid(), IsActive = true }, Guid.NewGuid()),
            new TestStaffRoleReader(null),
            repo,
            new TestHotelCatalogRepo(),
            new ShopTimeZone(TimeZoneInfo.Utc),
            new TestConcurrencyGuard(),
            NoNotifier());
        var excludedId = Guid.NewGuid();

        var capacity = await service.HasCapacityForGroupAsync(
            Species.Dog, SizeGroup.Small,
            new DateTimeOffset(2026, 11, 11, 7, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 11, 12, 5, 0, 0, TimeSpan.Zero),
            excludedId);

        Check(!capacity, "The only cage is held on the night of 11/11, so there must be no capacity.");
        Check(repo.LastExcludeAppointmentId == excludedId, "The held stays query must receive the excluded appointment id.");
    }),
    ("HotelBookingService.NormalizeStay converts to UTC and rejects past or same-day stays", () =>
    {
        var service = new HotelBookingService(
            new TestPetRepo(new Pet { PetId = Guid.NewGuid(), IsActive = true }, Guid.NewGuid()),
            new TestStaffRoleReader(null),
            new TestHotelBookingRepo(1, []),
            new TestHotelCatalogRepo(),
            new ShopTimeZone(TimeZoneInfo.Utc),
            new TestConcurrencyGuard(),
            NoNotifier());

        var day = DateTimeOffset.UtcNow.AddDays(3);
        var checkIn = new DateTimeOffset(day.Year, day.Month, day.Day, 10, 0, 0, TimeSpan.FromHours(7));
        var normalized = service.NormalizeStay(checkIn, checkIn.AddDays(2));
        Check(normalized.CheckIn.Offset == TimeSpan.Zero && normalized.CheckIn == checkIn,
            "The check-in must be converted to UTC without changing the instant.");

        var sameDayIn = new DateTimeOffset(day.Year, day.Month, day.Day, 8, 0, 0, TimeSpan.Zero);
        foreach (var (invalidIn, invalidOut) in new[]
        {
            (DateTimeOffset.UtcNow.AddHours(-1), DateTimeOffset.UtcNow.AddDays(2)),
            (sameDayIn, sameDayIn.AddHours(10)),
        })
        {
            var threw = false;
            try
            {
                service.NormalizeStay(invalidIn, invalidOut);
            }
            catch (BusinessException ex) when (ex.Code == ErrorCodes.ValidationError)
            {
                threw = true;
            }

            Check(threw, "A past check-in or a same-day check-out must be rejected with VALIDATION_ERROR.");
        }

        return Task.CompletedTask;
    }),
    ("AppointmentChangeService.ChangeAsync moves a confirmed spa appointment to Pending with the new schedule", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new ChangeFixture(appointment);

        var status = await fixture.ChangeService.ChangeAsync(fixture.Customer, appointment.AppointmentId, fixture.SpaChange);

        Check(status == AppointmentStatus.Pending && appointment.Status == AppointmentStatus.Pending,
            "A customer change of a confirmed appointment must return it to Pending.");
        Check(appointment.PetId == fixture.Pet.PetId && appointment.SizeGroup == SizeGroup.Medium,
            "The pet and size group must follow the new pet.");
        Check(appointment.SlotStart == fixture.NewSlot
              && appointment.SlotEnd == fixture.NewSlot.AddMinutes(60)
              && appointment.BusyUntil == fixture.NewSlot.AddMinutes(75)
              && appointment.StaffRequired == 1,
            "The schedule must be recomputed from the new slot, duration and buffer.");
        Check(fixture.Changes.SavedSpaServiceIds.Count == 1
              && fixture.Changes.SavedSpaServiceIds[0].SequenceEqual(new[] { fixture.ServiceId }),
            "The new service list must be saved once.");
        Check(fixture.Schedule.LastExcludeAppointmentId == appointment.AppointmentId,
            "The availability check must exclude the appointment being changed.");
        Check(string.Join(",", fixture.Guard.LockOrder) == "lock-day,lock-appointment",
            "The day lock must be taken before the appointment row lock.");
        Check(fixture.Guard.LockedAppointmentId == appointment.AppointmentId, "The appointment row must be locked.");
    }),
    ("AppointmentChangeService.ChangeAsync enforces the configured change window against the current start", async () =>
    {
        foreach (var (deadline, startsInMinutes, shouldBeOpen) in new[] { (60, 30, false), (120, 90, false), (120, 150, true), (60, 60 * 24, true) })
        {
            var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromMinutes(startsInMinutes));
            var fixture = new ChangeFixture(appointment, deadlineMinutes: deadline);

            var code = await FailureCodeAsync(() =>
                fixture.ChangeService.ChangeAsync(fixture.Customer, appointment.AppointmentId, fixture.SpaChange));

            if (shouldBeOpen)
            {
                Check(code is null && appointment.Status == AppointmentStatus.Pending,
                    $"With a {deadline}-minute window, a start {startsInMinutes} minutes away must be changeable.");
            }
            else
            {
                Check(code == ErrorCodes.ChangeWindowClosed,
                    $"With a {deadline}-minute window, a start {startsInMinutes} minutes away must be rejected.");
                Check(appointment.Status == AppointmentStatus.Confirmed && fixture.Changes.SavedSpaServiceIds.Count == 0
                      && fixture.Guard.LockOrder.Count == 0,
                    "A closed window must not lock, change or save anything.");
            }
        }
    }),
    ("AppointmentChangeService.ChangeAsync rejects other customers, unknown appointments and non-customers", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new ChangeFixture(appointment);

        var otherCustomer = new CurrentUser(Guid.NewGuid(), UserRole.Customer);
        var manager = new CurrentUser(fixture.OwnerUserId, UserRole.Manager);

        Check(await FailureCodeAsync(() => fixture.ChangeService.ChangeAsync(otherCustomer, appointment.AppointmentId, fixture.SpaChange)) == ErrorCodes.Forbidden,
            "Another customer's appointment must be rejected with FORBIDDEN.");
        Check(await FailureCodeAsync(() => fixture.ChangeService.ChangeAsync(fixture.Customer, Guid.NewGuid(), fixture.SpaChange)) == ErrorCodes.NotFound,
            "An unknown appointment must be rejected with NOT_FOUND.");
        Check(await FailureCodeAsync(() => fixture.ChangeService.ChangeAsync(manager, appointment.AppointmentId, fixture.SpaChange)) == ErrorCodes.Forbidden,
            "A non-customer must be rejected with FORBIDDEN.");
        Check(appointment.Status == AppointmentStatus.Confirmed && fixture.Changes.SavedSpaServiceIds.Count == 0
              && fixture.Guard.LockOrder.Count == 0,
            "Rejected requests must not lock, change or save anything.");
    }),
    ("AppointmentChangeService.ChangeAsync rejects statuses other than Pending and Confirmed", async () =>
    {
        var spa = OldSpaAppointment(AppointmentStatus.Received, TimeSpan.FromDays(5));
        var spaFixture = new ChangeFixture(spa);
        var hotel = OldHotelAppointment(AppointmentStatus.InStay, TimeSpan.FromDays(5));
        var hotelFixture = new ChangeFixture(hotel);

        Check(await FailureCodeAsync(() => spaFixture.ChangeService.ChangeAsync(spaFixture.Customer, spa.AppointmentId, spaFixture.SpaChange)) == ErrorCodes.InvalidTransition,
            "A received spa appointment must be rejected with INVALID_TRANSITION.");
        Check(await FailureCodeAsync(() => hotelFixture.ChangeService.ChangeAsync(hotelFixture.Customer, hotel.AppointmentId, hotelFixture.HotelChange)) == ErrorCodes.InvalidTransition,
            "An in-stay appointment must be rejected with INVALID_TRANSITION.");
        Check(spaFixture.Guard.LockOrder.Count == 0 && hotelFixture.Guard.LockOrder.Count == 0
              && spaFixture.Changes.SavedSpaServiceIds.Count == 0 && hotelFixture.Changes.SavedHotelChanges == 0,
            "Rejected statuses must not lock or save anything.");
    }),
    ("AppointmentChangeService.ChangeAsync requires the fields of the appointment type and the customer's own pet", async () =>
    {
        var spa = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var spaFixture = new ChangeFixture(spa);
        var hotel = OldHotelAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var hotelFixture = new ChangeFixture(hotel);
        var foreignPetSpa = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var foreignPetFixture = new ChangeFixture(foreignPetSpa, petBelongsToOther: true);

        Check(await FailureCodeAsync(() => spaFixture.ChangeService.ChangeAsync(spaFixture.Customer, spa.AppointmentId,
                spaFixture.SpaChange with { SlotStart = null })) == ErrorCodes.ValidationError,
            "A spa change without slotStart must be rejected with VALIDATION_ERROR.");
        Check(await FailureCodeAsync(() => spaFixture.ChangeService.ChangeAsync(spaFixture.Customer, spa.AppointmentId,
                spaFixture.SpaChange with { ServiceIds = [] })) == ErrorCodes.ValidationError,
            "A spa change without services must be rejected with VALIDATION_ERROR.");
        Check(await FailureCodeAsync(() => hotelFixture.ChangeService.ChangeAsync(hotelFixture.Customer, hotel.AppointmentId,
                hotelFixture.HotelChange with { PlannedCheckOut = null })) == ErrorCodes.ValidationError,
            "A hotel change without plannedCheckOut must be rejected with VALIDATION_ERROR.");
        Check(await FailureCodeAsync(() => foreignPetFixture.ChangeService.ChangeAsync(foreignPetFixture.Customer, foreignPetSpa.AppointmentId,
                foreignPetFixture.SpaChange)) == ErrorCodes.Forbidden,
            "Another customer's pet must be rejected with FORBIDDEN.");
        Check(spaFixture.Guard.LockOrder.Count == 0 && hotelFixture.Guard.LockOrder.Count == 0
              && foreignPetFixture.Guard.LockOrder.Count == 0,
            "Invalid payloads and foreign pets must be rejected before any lock.");
    }),
    ("AppointmentChangeService.ChangeAsync maps a full slot to SLOT_FULL and leaves the appointment unchanged", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var oldStart = appointment.SlotStart;
        var fixture = new ChangeFixture(appointment, slotIsHeld: true);

        var code = await FailureCodeAsync(() =>
            fixture.ChangeService.ChangeAsync(fixture.Customer, appointment.AppointmentId, fixture.SpaChange));

        Check(code == ErrorCodes.SlotFull, "A held slot must be rejected with SLOT_FULL.");
        Check(appointment.Status == AppointmentStatus.Confirmed && appointment.SlotStart == oldStart
              && fixture.Changes.SavedSpaServiceIds.Count == 0,
            "A rejected change must leave the appointment and storage untouched.");
    }),
    ("AppointmentChangeService.ChangeAsync re-checks status and window after the row lock", async () =>
    {
        var becomesReceived = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var statusFixture = new ChangeFixture(becomesReceived, beforeFindForUpdate: a => a.Status = AppointmentStatus.Received);

        var movedCloser = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var windowFixture = new ChangeFixture(movedCloser, beforeFindForUpdate: a => ((SpaAppointment)a).SlotStart = DateTimeOffset.UtcNow.AddMinutes(10));

        Check(await FailureCodeAsync(() => statusFixture.ChangeService.ChangeAsync(statusFixture.Customer, becomesReceived.AppointmentId, statusFixture.SpaChange)) == ErrorCodes.InvalidTransition,
            "A status that changed before the lock must be rejected with INVALID_TRANSITION.");
        Check(await FailureCodeAsync(() => windowFixture.ChangeService.ChangeAsync(windowFixture.Customer, movedCloser.AppointmentId, windowFixture.SpaChange)) == ErrorCodes.ChangeWindowClosed,
            "A start that moved inside the window before the lock must be rejected with CHANGE_WINDOW_CLOSED.");
        Check(statusFixture.Changes.SavedSpaServiceIds.Count == 0 && windowFixture.Changes.SavedSpaServiceIds.Count == 0,
            "Nothing may be saved after a failed re-check.");
    }),
    ("AppointmentChangeService.ChangeAsync moves a confirmed hotel appointment to Pending and drops the cage", async () =>
    {
        var appointment = OldHotelAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new ChangeFixture(appointment);

        var status = await fixture.ChangeService.ChangeAsync(fixture.Customer, appointment.AppointmentId, fixture.HotelChange);

        Check(status == AppointmentStatus.Pending && appointment.Status == AppointmentStatus.Pending,
            "A customer change of a confirmed stay must return it to Pending.");
        Check(appointment.CageId is null, "The assigned cage must be dropped.");
        Check(appointment.PlannedCheckIn == fixture.NewSlot && appointment.PlannedCheckOut == fixture.NewCheckOut
              && appointment.PetId == fixture.Pet.PetId && appointment.SizeGroup == SizeGroup.Medium,
            "The stay and the pet must be replaced.");
        Check(fixture.Guard.LockedHotelGroup == (Species.Dog, SizeGroup.Medium)
              && string.Join(",", fixture.Guard.LockOrder) == "lock-hotel-group,lock-appointment",
            "The hotel group lock must be taken for the new pet before the appointment row lock.");
        Check(fixture.HotelRepo.LastExcludeAppointmentId == appointment.AppointmentId && fixture.Changes.SavedHotelChanges == 1,
            "The capacity check must exclude the appointment being changed and the change must be saved once.");
    }),
    ("AppointmentChangeService.ChangeAsync maps a full hotel group to NO_CAPACITY", async () =>
    {
        var appointment = OldHotelAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new ChangeFixture(appointment, hotelIsFull: true);

        var code = await FailureCodeAsync(() =>
            fixture.ChangeService.ChangeAsync(fixture.Customer, appointment.AppointmentId, fixture.HotelChange));

        Check(code == ErrorCodes.NoCapacity, "A full group must be rejected with NO_CAPACITY.");
        Check(appointment.Status == AppointmentStatus.Confirmed && appointment.CageId is not null
              && fixture.Changes.SavedHotelChanges == 0,
            "A rejected change must leave the stay untouched.");
    }),
    ("UpdateAppointmentRequestValidator requires petId and rejects invalid services and past starts", () =>
    {
        var validator = new UpdateAppointmentRequestValidator();
        var future = DateTimeOffset.UtcNow.AddDays(2);

        Check(validator.Validate(new UpdateAppointmentRequest(Guid.NewGuid(), future, [Guid.NewGuid()], null, null)).IsValid,
            "A valid spa change must pass.");
        Check(validator.Validate(new UpdateAppointmentRequest(Guid.NewGuid(), null, null, future, future.AddDays(1))).IsValid,
            "A valid hotel change must pass.");

        var missingPet = validator.Validate(new UpdateAppointmentRequest(null, future, [Guid.NewGuid()], null, null));
        Check(!missingPet.IsValid && missingPet.Errors.Any(e => e.PropertyName == "PetId"), "A missing petId must fail.");

        var emptyServices = validator.Validate(new UpdateAppointmentRequest(Guid.NewGuid(), future, [], null, null));
        Check(!emptyServices.IsValid && emptyServices.Errors.Any(e => e.PropertyName == "ServiceIds"), "An empty serviceIds must fail.");

        var emptyServiceId = validator.Validate(new UpdateAppointmentRequest(Guid.NewGuid(), future, [Guid.Empty], null, null));
        Check(!emptyServiceId.IsValid && emptyServiceId.Errors.Any(e => e.PropertyName == "ServiceIds"), "An empty service id must fail.");

        var pastSlot = validator.Validate(new UpdateAppointmentRequest(Guid.NewGuid(), DateTimeOffset.UtcNow.AddHours(-1), [Guid.NewGuid()], null, null));
        Check(!pastSlot.IsValid && pastSlot.Errors.Any(e => e.PropertyName == "SlotStart"), "A past slotStart must fail.");

        var pastCheckIn = validator.Validate(new UpdateAppointmentRequest(Guid.NewGuid(), null, null, DateTimeOffset.UtcNow.AddHours(-1), future));
        Check(!pastCheckIn.IsValid && pastCheckIn.Errors.Any(e => e.PropertyName == "PlannedCheckIn"), "A past plannedCheckIn must fail.");

        return Task.CompletedTask;
    }),
    ("AppointmentsController.Update rejects a null request and is a PUT restricted to the CustomerOrManager policy", async () =>
    {
        var controller = new AppointmentsController(null!);
        Check(await FailureCodeAsync(() => controller.Update(Guid.NewGuid(), null, CancellationToken.None)) == ErrorCodes.ValidationError,
            "A null request must be rejected with VALIDATION_ERROR.");

        var method = typeof(AppointmentsController).GetMethod(nameof(AppointmentsController.Update));
        var put = method?.GetCustomAttributes(typeof(HttpPutAttribute), true).OfType<HttpPutAttribute>().FirstOrDefault();
        var authorize = method?.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), true)
            .OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().FirstOrDefault();

        Check(put?.Template == "{id}", "Update must be bound to PUT {id}.");
        Check(authorize?.Policy == AuthorizationPolicies.CustomerOrManager, "Update must require the CustomerOrManager policy.");
        Check(typeof(UpdateAppointmentRequest).GetProperty("Status") is null
              && typeof(UpdateAppointmentRequest).GetProperty("Amount") is null
              && typeof(UpdateAppointmentRequest).GetProperty("StaffIds") is not null
              && typeof(UpdateAppointmentRequest).GetProperty("CageId") is not null
              && typeof(UpdateAppointmentRequest).GetProperty("ConfirmOutOfShift") is not null,
            "The request must carry the manager fields but never a status or an amount.");
    }),
    ("AppointmentsController.Update lets a manager reschedule through the intervention service and returns only the status", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment, holdsStaff: true);
        var controller = new AppointmentsController(null!, appointmentInterventionService: fixture.Intervention)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, Guid.NewGuid().ToString()),
                        new Claim(TokenClaims.Role, "Manager"),
                    ], "test")),
                },
            },
        };

        var ok = await controller.Update(
            appointment.AppointmentId,
            new UpdateAppointmentRequest(fixture.Pet.PetId, fixture.NewSlot, [fixture.ServiceId], null, null),
            CancellationToken.None) as OkObjectResult;

        Check(ok?.Value is AppointmentStatusResponse { Status: AppointmentStatus.Confirmed },
            "Update must return 200 with Confirmed status.");
        Check(appointment.SlotStart == fixture.NewSlot, "The new slot must be applied.");

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        Check(JsonSerializer.Serialize(ok!.Value, options) == "{\"status\":\"Confirmed\"}",
            "The response body must contain only the status.");
    }),
    ("AppointmentsController.Update keeps the customer path unchanged and ignores manager fields", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new ChangeFixture(appointment);
        var controller = new AppointmentsController(null!, appointmentChangeService: fixture.ChangeService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, fixture.OwnerUserId.ToString()),
                        new Claim(TokenClaims.Role, "Customer"),
                    ], "test")),
                },
            },
        };

        var request = new UpdateAppointmentRequest(
            fixture.Pet.PetId,
            fixture.NewSlot,
            [fixture.ServiceId],
            null,
            null,
            StaffIds: [Guid.NewGuid()],
            CageId: Guid.NewGuid(),
            ConfirmOutOfShift: true);

        var ok = await controller.Update(appointment.AppointmentId, request, CancellationToken.None) as OkObjectResult;

        Check(ok?.Value is AppointmentStatusResponse { Status: AppointmentStatus.Pending },
            "Customer update must return Pending.");
        Check(fixture.Changes.SavedSpaServiceIds.Count == 1, "The customer change service must be called.");
    }),
    ("UpdateAppointmentRequestValidator validates the manager fields", () =>
    {
        var validator = new UpdateAppointmentRequestValidator();
        var future = DateTimeOffset.UtcNow.AddDays(2);
        var validStaff1 = Guid.NewGuid();
        var validStaff2 = Guid.NewGuid();
        var validCage = Guid.NewGuid();

        var validResult1 = validator.Validate(new UpdateAppointmentRequest(Guid.NewGuid(), future, [Guid.NewGuid()], null, null, StaffIds: [validStaff1], CageId: validCage));
        Check(validResult1.IsValid, "Single staffId and valid cageId must be valid.");

        var validResult2 = validator.Validate(new UpdateAppointmentRequest(Guid.NewGuid(), future, [Guid.NewGuid()], null, null, StaffIds: [validStaff1, validStaff2], CageId: validCage));
        Check(validResult2.IsValid, "Two staffIds and valid cageId must be valid.");

        var emptyStaffResult = validator.Validate(new UpdateAppointmentRequest(Guid.NewGuid(), future, [Guid.NewGuid()], null, null, StaffIds: []));
        Check(!emptyStaffResult.IsValid && emptyStaffResult.Errors.Any(e => e.PropertyName == "StaffIds"),
            "Empty staffIds must fail validation on StaffIds.");

        var threeStaffResult = validator.Validate(new UpdateAppointmentRequest(Guid.NewGuid(), future, [Guid.NewGuid()], null, null, StaffIds: [validStaff1, validStaff2, Guid.NewGuid()]));
        Check(!threeStaffResult.IsValid && threeStaffResult.Errors.Any(e => e.PropertyName == "StaffIds"),
            "Three staffIds must fail validation on StaffIds.");

        var emptyGuidStaffResult = validator.Validate(new UpdateAppointmentRequest(Guid.NewGuid(), future, [Guid.NewGuid()], null, null, StaffIds: [Guid.Empty]));
        Check(!emptyGuidStaffResult.IsValid && emptyGuidStaffResult.Errors.Any(e => e.PropertyName == "StaffIds"),
            "Guid.Empty in staffIds must fail validation on StaffIds.");

        var emptyGuidCageResult = validator.Validate(new UpdateAppointmentRequest(Guid.NewGuid(), future, [Guid.NewGuid()], null, null, CageId: Guid.Empty));
        Check(!emptyGuidCageResult.IsValid && emptyGuidCageResult.Errors.Any(e => e.PropertyName == "CageId"),
            "Guid.Empty in cageId must fail validation on CageId.");

        return Task.CompletedTask;
    }),
    ("AppointmentInterventionService.ResolveCancelAsync records the reason for a cancellable appointment without changing anything", async () =>
    {
        var cases = new (Appointment appointment, CancelReason reason)[]
        {
            (OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5)), CancelReason.StoreUnable),
            (OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5)), CancelReason.CustomerBeyondDeadline),
            (OldHotelAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5)), CancelReason.StoreUnable),
        };

        foreach (var (appointment, reason) in cases)
        {
            var initialStatus = appointment.Status;
            var fixture = new InterventionFixture(appointment);

            var decision = await fixture.Intervention.ResolveCancelAsync(fixture.Manager, appointment.AppointmentId, reason);

            Check(decision.Reason == reason, "The decision must carry the requested reason.");
            Check(ReferenceEquals(decision.Appointment, appointment), "The decision must reference the target appointment.");
            Check(appointment.Status == initialStatus, "The status must remain unchanged.");
            Check(fixture.Changes.SavedCancellations.Count == 0, "No cancellations must be saved to the database.");
            Check(fixture.Guard.RunCalls == 0, "No transaction or lock must be executed.");
        }
    }),
    ("AppointmentInterventionService.ResolveCancelAsync requires a manager", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment);

        foreach (var role in new[] { UserRole.Customer, UserRole.Staff })
        {
            var codeWithReason = await FailureCodeAsync(() => fixture.Intervention.ResolveCancelAsync(
                new CurrentUser(Guid.NewGuid(), role), appointment.AppointmentId, CancelReason.StoreUnable));
            Check(codeWithReason == ErrorCodes.Forbidden, $"{role} must be rejected with FORBIDDEN even with reason.");

            var codeNullReason = await FailureCodeAsync(() => fixture.Intervention.ResolveCancelAsync(
                new CurrentUser(Guid.NewGuid(), role), appointment.AppointmentId, null));
            Check(codeNullReason == ErrorCodes.Forbidden, $"{role} must be rejected with FORBIDDEN before checking reason.");
        }
    }),
    ("AppointmentInterventionService.ResolveCancelAsync requires a reason a manager may give", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment);

        var nullCode = await FailureCodeAsync(() => fixture.Intervention.ResolveCancelAsync(
            fixture.Manager, appointment.AppointmentId, null));
        Check(nullCode == ErrorCodes.ValidationError, "Null reason must yield ValidationError.");

        foreach (var invalidReason in new[] { CancelReason.CustomerCancelled, CancelReason.NoShow, CancelReason.CostNotConfirmed })
        {
            var code = await FailureCodeAsync(() => fixture.Intervention.ResolveCancelAsync(
                fixture.Manager, appointment.AppointmentId, invalidReason));
            Check(code == ErrorCodes.ValidationError, $"{invalidReason} must yield ValidationError for manager cancel.");
        }
    }),
    ("AppointmentInterventionService.ResolveCancelAsync rejects unknown appointments and statuses that cannot be cancelled with the reason", async () =>
    {
        var fixtureUnknown = new InterventionFixture(OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5)));
        var unknownCode = await FailureCodeAsync(() => fixtureUnknown.Intervention.ResolveCancelAsync(
            fixtureUnknown.Manager, Guid.NewGuid(), CancelReason.StoreUnable));
        Check(unknownCode == ErrorCodes.NotFound, "Unknown appointment must yield NotFound.");

        var invalidStatusCases = new Appointment[]
        {
            OldSpaAppointment(AppointmentStatus.Completed, TimeSpan.FromDays(5)),
            OldSpaAppointment(AppointmentStatus.Cancelled, TimeSpan.FromDays(5)),
            OldHotelAppointment(AppointmentStatus.Completed, TimeSpan.FromDays(5)),
        };

        foreach (var appt in invalidStatusCases)
        {
            var fixture = new InterventionFixture(appt);
            var code = await FailureCodeAsync(() => fixture.Intervention.ResolveCancelAsync(
                fixture.Manager, appt.AppointmentId, CancelReason.StoreUnable));
            Check(code == ErrorCodes.InvalidTransition, $"Status {appt.Status} must yield InvalidTransition.");
        }
    }),
    ("AppointmentInterventionService.CancelAsync cancels any appointment before Completed with the manager reason", async () =>
    {
        var spaStatuses = new[]
        {
            AppointmentStatus.Pending,
            AppointmentStatus.Confirmed,
            AppointmentStatus.Received,
            AppointmentStatus.InProgress,
        };

        var hotelStatuses = new[]
        {
            AppointmentStatus.Pending,
            AppointmentStatus.Confirmed,
            AppointmentStatus.InStay,
        };

        var reasons = new[]
        {
            CancelReason.StoreUnable,
            CancelReason.CustomerBeyondDeadline,
        };

        foreach (var status in spaStatuses)
        {
            foreach (var reason in reasons)
            {
                var appointment = OldSpaAppointment(status, TimeSpan.FromDays(5));
                var fixture = new InterventionFixture(appointment);

                var result = await fixture.Intervention.CancelAsync(fixture.Manager, appointment.AppointmentId, reason);

                Check(result == AppointmentStatus.Cancelled, "CancelAsync must return Cancelled.");
                Check(appointment.Status == AppointmentStatus.Cancelled, "Status must be Cancelled.");
                Check(appointment.CancelReason == reason, "CancelReason must match requested reason.");
                Check(appointment.CancelledAt != null, "CancelledAt must not be null.");
                Check(fixture.Changes.SavedCancellations.Count == 1 && ReferenceEquals(fixture.Changes.SavedCancellations[0], appointment),
                    "SavedCancellations must contain the appointment.");
                Check(fixture.Guard.RunCalls == 1, "RunCalls must be 1.");
                Check(string.Join(",", fixture.Guard.LockOrder) == "lock-appointment", "Lock order must be lock-appointment.");
            }
        }

        foreach (var status in hotelStatuses)
        {
            foreach (var reason in reasons)
            {
                var appointment = OldHotelAppointment(status, TimeSpan.FromDays(5));
                var initialCageId = appointment.CageId;
                var fixture = new InterventionFixture(appointment);

                var result = await fixture.Intervention.CancelAsync(fixture.Manager, appointment.AppointmentId, reason);

                Check(result == AppointmentStatus.Cancelled, "CancelAsync must return Cancelled for hotel.");
                Check(appointment.Status == AppointmentStatus.Cancelled, "Hotel status must be Cancelled.");
                Check(appointment.CancelReason == reason, "Hotel CancelReason must match requested reason.");
                Check(appointment.CancelledAt != null, "Hotel CancelledAt must not be null.");
                Check(fixture.Changes.SavedCancellations.Count == 1 && ReferenceEquals(fixture.Changes.SavedCancellations[0], appointment),
                    "Hotel SavedCancellations must contain the appointment.");
                Check(fixture.Guard.RunCalls == 1, "Hotel RunCalls must be 1.");
                Check(string.Join(",", fixture.Guard.LockOrder) == "lock-appointment", "Hotel lock order must be lock-appointment.");
                Check(appointment.CageId == initialCageId, "Hotel CageId must remain unchanged.");
            }
        }
    }),
    ("AppointmentInterventionService.CancelAsync ignores the customer change window", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromMinutes(5));
        var fixture = new InterventionFixture(appointment);

        var result = await fixture.Intervention.CancelAsync(fixture.Manager, appointment.AppointmentId, CancelReason.StoreUnable);

        Check(result == AppointmentStatus.Cancelled, "Manager cancel must succeed within customer deadline window.");
        Check(appointment.Status == AppointmentStatus.Cancelled, "Appointment must be Cancelled.");
    }),
    ("AppointmentInterventionService.CancelAsync rejects non-managers, bad reasons, unknown and finished appointments before any transaction", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment);

        foreach (var role in new[] { UserRole.Customer, UserRole.Staff })
        {
            var code = await FailureCodeAsync(() => fixture.Intervention.CancelAsync(
                new CurrentUser(Guid.NewGuid(), role), appointment.AppointmentId, CancelReason.StoreUnable));
            Check(code == ErrorCodes.Forbidden, $"{role} must be rejected with FORBIDDEN.");
        }

        var badReasons = new CancelReason?[]
        {
            null,
            CancelReason.CustomerCancelled,
            CancelReason.NoShow,
            CancelReason.CostNotConfirmed,
        };

        foreach (var badReason in badReasons)
        {
            var code = await FailureCodeAsync(() => fixture.Intervention.CancelAsync(
                fixture.Manager, appointment.AppointmentId, badReason));
            Check(code == ErrorCodes.ValidationError, $"{badReason} must be rejected with VALIDATION_ERROR.");
        }

        var unknownFixture = new InterventionFixture(appointment);
        var unknownCode = await FailureCodeAsync(() => unknownFixture.Intervention.CancelAsync(
            unknownFixture.Manager, Guid.NewGuid(), CancelReason.StoreUnable));
        Check(unknownCode == ErrorCodes.NotFound, "Unknown appointment must yield NOT_FOUND.");

        var finishedCases = new Appointment[]
        {
            OldSpaAppointment(AppointmentStatus.Completed, TimeSpan.FromDays(5)),
            OldSpaAppointment(AppointmentStatus.Cancelled, TimeSpan.FromDays(5)),
            OldHotelAppointment(AppointmentStatus.Completed, TimeSpan.FromDays(5)),
            OldHotelAppointment(AppointmentStatus.Cancelled, TimeSpan.FromDays(5)),
        };

        foreach (var finished in finishedCases)
        {
            var finishedFixture = new InterventionFixture(finished);
            var code = await FailureCodeAsync(() => finishedFixture.Intervention.CancelAsync(
                finishedFixture.Manager, finished.AppointmentId, CancelReason.StoreUnable));
            Check(code == ErrorCodes.InvalidTransition, $"Finished status {finished.Status} must yield INVALID_TRANSITION.");
        }

        Check(fixture.Guard.RunCalls == 0 && fixture.Changes.SavedCancellations.Count == 0,
            "No transaction or saved cancellation on early failure.");
    }),
    ("AppointmentInterventionService.CancelAsync re-checks the status after the row lock", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment, beforeFindForUpdate: a => a.Status = AppointmentStatus.Completed);

        var code = await FailureCodeAsync(() => fixture.Intervention.CancelAsync(
            fixture.Manager, appointment.AppointmentId, CancelReason.StoreUnable));

        Check(code == ErrorCodes.InvalidTransition, "Status changed after lock must yield INVALID_TRANSITION.");
        Check(fixture.Changes.SavedCancellations.Count == 0, "No cancellation must be saved when re-check fails.");
    }),
    ("AppointmentsController.Cancel lets a manager cancel with a reason", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment);
        var controller = new AppointmentsController(null!, appointmentInterventionService: fixture.Intervention)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, Guid.NewGuid().ToString()),
                        new Claim(TokenClaims.Role, "Manager"),
                    ], "test")),
                },
            },
        };

        var ok = await controller.Cancel(
            appointment.AppointmentId,
            new CancelAppointmentRequest(CancelReason.StoreUnable),
            CancellationToken.None) as OkObjectResult;

        Check(ok?.Value is AppointmentStatusResponse { Status: AppointmentStatus.Cancelled },
            "Cancel must return 200 with Cancelled status.");
        Check(appointment.Status == AppointmentStatus.Cancelled, "Status must be Cancelled.");
        Check(appointment.CancelReason == CancelReason.StoreUnable, "CancelReason must be StoreUnable.");
    }),
    ("AppointmentsController.Cancel without a reason from a manager is rejected", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment);
        var controller = new AppointmentsController(null!, appointmentInterventionService: fixture.Intervention)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, Guid.NewGuid().ToString()),
                        new Claim(TokenClaims.Role, "Manager"),
                    ], "test")),
                },
            },
        };

        var code = await FailureCodeAsync(() => controller.Cancel(appointment.AppointmentId, null, CancellationToken.None));
        Check(code == ErrorCodes.ValidationError, "Manager cancel without reason must yield VALIDATION_ERROR.");
        Check(fixture.Changes.SavedCancellations.Count == 0, "No cancellations saved on null request.");
    }),
    ("CancelAppointmentRequestValidator accepts only the manager reasons", () =>
    {
        var validator = new CancelAppointmentRequestValidator();

        var validNull = validator.Validate(new CancelAppointmentRequest(null));
        Check(validNull.IsValid, "Null reason must be valid in request validator.");

        var validStoreUnable = validator.Validate(new CancelAppointmentRequest(CancelReason.StoreUnable));
        Check(validStoreUnable.IsValid, "StoreUnable must be valid.");

        var validCustomerBeyond = validator.Validate(new CancelAppointmentRequest(CancelReason.CustomerBeyondDeadline));
        Check(validCustomerBeyond.IsValid, "CustomerBeyondDeadline must be valid.");

        foreach (var invalidReason in new[] { CancelReason.CustomerCancelled, CancelReason.NoShow, CancelReason.CostNotConfirmed })
        {
            var result = validator.Validate(new CancelAppointmentRequest(invalidReason));
            Check(!result.IsValid && result.Errors.Any(e => e.PropertyName == "Reason"),
                $"{invalidReason} must fail validation on Reason.");
        }

        return Task.CompletedTask;
    }),
    ("AppointmentChangeService.ResolveCancelTargetAsync returns the appointment of its owner without checking status or window", async () =>
    {
        var spa = OldSpaAppointment(AppointmentStatus.Received, TimeSpan.FromMinutes(5));
        var spaFixture = new ChangeFixture(spa);
        var hotel = OldHotelAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var hotelFixture = new ChangeFixture(hotel);

        var spaTarget = await spaFixture.ChangeService.ResolveCancelTargetAsync(spaFixture.Customer, spa.AppointmentId);
        var hotelTarget = await hotelFixture.ChangeService.ResolveCancelTargetAsync(hotelFixture.Customer, hotel.AppointmentId);

        Check(ReferenceEquals(spaTarget.Appointment, spa) && spaTarget.OwnerUserId == spaFixture.OwnerUserId,
            "The spa appointment must be returned for its owner even when it is past the window or not changeable.");
        Check(ReferenceEquals(hotelTarget.Appointment, hotel) && hotelTarget.Appointment is HotelAppointment,
            "The hotel appointment must be returned for its owner.");
    }),
    ("AppointmentChangeService.ResolveCancelTargetAsync rejects other customers, unknown appointments and non-customers", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new ChangeFixture(appointment);
        var otherCustomer = new CurrentUser(Guid.NewGuid(), UserRole.Customer);
        var receptionist = new CurrentUser(fixture.OwnerUserId, UserRole.Staff);

        Check(await FailureCodeAsync(() => fixture.ChangeService.ResolveCancelTargetAsync(otherCustomer, appointment.AppointmentId)) == ErrorCodes.Forbidden,
            "Another customer's appointment must be rejected with FORBIDDEN.");
        Check(await FailureCodeAsync(() => fixture.ChangeService.ResolveCancelTargetAsync(fixture.Customer, Guid.NewGuid())) == ErrorCodes.NotFound,
            "An unknown appointment must be rejected with NOT_FOUND.");
        Check(await FailureCodeAsync(() => fixture.ChangeService.ResolveCancelTargetAsync(receptionist, appointment.AppointmentId)) == ErrorCodes.Forbidden,
            "A non-customer must be rejected with FORBIDDEN.");
    }),
    ("AppointmentChangeService.ResolveCancelTargetAsync does not read the window, lock or change anything", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new ChangeFixture(appointment);

        await fixture.ChangeService.ResolveCancelTargetAsync(fixture.Customer, appointment.AppointmentId);

        Check(fixture.Changes.DeadlineReads == 0, "The window configuration must not be read at this step.");
        Check(fixture.Guard.LockOrder.Count == 0 && fixture.Changes.SavedSpaServiceIds.Count == 0
              && appointment.Status == AppointmentStatus.Confirmed,
            "Nothing may be locked, saved or changed at this step.");
    }),
    ("AppointmentChangeService.CancelAsync cancels a pending or confirmed appointment as CustomerCancelled", async () =>
    {
        foreach (var status in new[] { AppointmentStatus.Pending, AppointmentStatus.Confirmed })
        {
            var spa = OldSpaAppointment(status, TimeSpan.FromDays(5));
            var spaFixture = new ChangeFixture(spa);
            var hotel = OldHotelAppointment(status, TimeSpan.FromDays(5));
            var hotelFixture = new ChangeFixture(hotel);
            var cageId = hotel.CageId;

            var spaResult = await spaFixture.ChangeService.CancelAsync(spaFixture.Customer, spa.AppointmentId);
            var hotelResult = await hotelFixture.ChangeService.CancelAsync(hotelFixture.Customer, hotel.AppointmentId);

            Check(spaResult == AppointmentStatus.Cancelled && spa.Status == AppointmentStatus.Cancelled
                  && spa.CancelReason == CancelReason.CustomerCancelled && spa.CancelledAt is not null,
                $"A {status} spa appointment must be cancelled with CustomerCancelled.");
            Check(hotelResult == AppointmentStatus.Cancelled && hotel.Status == AppointmentStatus.Cancelled
                  && hotel.CancelReason == CancelReason.CustomerCancelled && hotel.CancelledAt is not null,
                $"A {status} hotel appointment must be cancelled with CustomerCancelled.");
            Check(hotel.CageId == cageId,
                "The cage assignment must stay as it is; leaving Confirmed releases the cage.");
            Check(spaFixture.Changes.SavedCancellations.Count == 1
                  && ReferenceEquals(spaFixture.Changes.SavedCancellations[0], spa)
                  && hotelFixture.Changes.SavedCancellations.Count == 1
                  && ReferenceEquals(hotelFixture.Changes.SavedCancellations[0], hotel),
                "Each cancellation must be saved exactly once.");
            Check(spaFixture.Guard.RunCalls == 1 && hotelFixture.Guard.RunCalls == 1
                  && string.Join(",", spaFixture.Guard.LockOrder) == "lock-appointment"
                  && string.Join(",", hotelFixture.Guard.LockOrder) == "lock-appointment",
                "Cancelling must run in one transaction and take only the appointment row lock.");
        }
    }),
    ("AppointmentChangeService.CancelAsync rejects statuses a customer may not cancel", async () =>
    {
        foreach (var status in new[] { AppointmentStatus.Received, AppointmentStatus.InProgress, AppointmentStatus.Completed, AppointmentStatus.Cancelled })
        {
            var spa = OldSpaAppointment(status, TimeSpan.FromDays(5));
            var fixture = new ChangeFixture(spa);

            Check(await FailureCodeAsync(() => fixture.ChangeService.CancelAsync(fixture.Customer, spa.AppointmentId)) == ErrorCodes.InvalidTransition,
                $"A {status} spa appointment must be rejected with INVALID_TRANSITION.");
            Check(spa.Status == status && spa.CancelReason is null && fixture.Changes.SavedCancellations.Count == 0
                  && fixture.Guard.LockOrder.Count == 0 && fixture.Guard.RunCalls == 0,
                "A rejected status must not lock, change or save anything.");
        }

        foreach (var status in new[] { AppointmentStatus.InStay, AppointmentStatus.Completed, AppointmentStatus.Cancelled })
        {
            var hotel = OldHotelAppointment(status, TimeSpan.FromDays(5));
            var fixture = new ChangeFixture(hotel);

            Check(await FailureCodeAsync(() => fixture.ChangeService.CancelAsync(fixture.Customer, hotel.AppointmentId)) == ErrorCodes.InvalidTransition,
                $"A {status} hotel appointment must be rejected with INVALID_TRANSITION.");
            Check(hotel.Status == status && hotel.CancelReason is null && fixture.Changes.SavedCancellations.Count == 0
                  && fixture.Guard.LockOrder.Count == 0 && fixture.Guard.RunCalls == 0,
                "A rejected status must not lock, change or save anything.");
        }
    }),
    ("AppointmentChangeService.CancelAsync rejects other customers, unknown appointments and non-customers", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new ChangeFixture(appointment);
        var otherCustomer = new CurrentUser(Guid.NewGuid(), UserRole.Customer);
        var manager = new CurrentUser(fixture.OwnerUserId, UserRole.Manager);

        Check(await FailureCodeAsync(() => fixture.ChangeService.CancelAsync(otherCustomer, appointment.AppointmentId)) == ErrorCodes.Forbidden,
            "Another customer's appointment must be rejected with FORBIDDEN.");
        Check(await FailureCodeAsync(() => fixture.ChangeService.CancelAsync(fixture.Customer, Guid.NewGuid())) == ErrorCodes.NotFound,
            "An unknown appointment must be rejected with NOT_FOUND.");
        Check(await FailureCodeAsync(() => fixture.ChangeService.CancelAsync(manager, appointment.AppointmentId)) == ErrorCodes.Forbidden,
            "A non-customer must be rejected with FORBIDDEN.");
        Check(appointment.Status == AppointmentStatus.Confirmed && fixture.Changes.SavedCancellations.Count == 0
              && fixture.Guard.LockOrder.Count == 0 && fixture.Guard.RunCalls == 0,
            "Rejected requests must not lock, change or save anything.");
    }),
    ("AppointmentChangeService.CancelAsync re-checks the status after the row lock", async () =>
    {
        var becomesReceived = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new ChangeFixture(becomesReceived, beforeFindForUpdate: a => a.Status = AppointmentStatus.Received);

        Check(await FailureCodeAsync(() => fixture.ChangeService.CancelAsync(fixture.Customer, becomesReceived.AppointmentId)) == ErrorCodes.InvalidTransition,
            "A status that changed before the lock must be rejected with INVALID_TRANSITION.");
        Check(becomesReceived.Status == AppointmentStatus.Received && becomesReceived.CancelReason is null
              && fixture.Changes.SavedCancellations.Count == 0,
            "Nothing may be changed or saved after a failed re-check.");
    }),
    ("AppointmentChangeService.CancelAsync enforces the configured window against the scheduled start", async () =>
    {
        foreach (var (deadline, startsInMinutes, shouldBeOpen) in new[] { (60, 30, false), (120, 90, false), (120, 150, true), (60, 60 * 24, true) })
        {
            var spa = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromMinutes(startsInMinutes));
            var spaFixture = new ChangeFixture(spa, deadlineMinutes: deadline);
            var hotel = OldHotelAppointment(AppointmentStatus.Pending, TimeSpan.FromMinutes(startsInMinutes));
            var hotelFixture = new ChangeFixture(hotel, deadlineMinutes: deadline);

            var spaCode = await FailureCodeAsync(() => spaFixture.ChangeService.CancelAsync(spaFixture.Customer, spa.AppointmentId));
            var hotelCode = await FailureCodeAsync(() => hotelFixture.ChangeService.CancelAsync(hotelFixture.Customer, hotel.AppointmentId));

            Check(spaFixture.Changes.DeadlineReads == 1 && hotelFixture.Changes.DeadlineReads == 1,
                "The deadline must be read from configuration on each request.");

            if (shouldBeOpen)
            {
                Check(spaCode is null && spa.Status == AppointmentStatus.Cancelled
                      && hotelCode is null && hotel.Status == AppointmentStatus.Cancelled,
                    $"With a {deadline}-minute window, a start {startsInMinutes} minutes away must be cancellable.");
            }
            else
            {
                Check(spaCode == ErrorCodes.ChangeWindowClosed && hotelCode == ErrorCodes.ChangeWindowClosed,
                    $"With a {deadline}-minute window, a start {startsInMinutes} minutes away must be rejected.");
                Check(spa.Status == AppointmentStatus.Confirmed && hotel.Status == AppointmentStatus.Pending
                      && spaFixture.Changes.SavedCancellations.Count == 0 && hotelFixture.Changes.SavedCancellations.Count == 0
                      && spaFixture.Guard.LockOrder.Count == 0 && hotelFixture.Guard.LockOrder.Count == 0
                      && spaFixture.Guard.RunCalls == 0 && hotelFixture.Guard.RunCalls == 0,
                    "A closed window must not lock, change or save anything.");
            }
        }
    }),
    ("AppointmentChangeService.CancelAsync checks ownership first and status before the window", async () =>
    {
        var closedWindow = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromMinutes(5));
        var closedFixture = new ChangeFixture(closedWindow);
        var otherCustomer = new CurrentUser(Guid.NewGuid(), UserRole.Customer);

        Check(await FailureCodeAsync(() => closedFixture.ChangeService.CancelAsync(otherCustomer, closedWindow.AppointmentId)) == ErrorCodes.Forbidden,
            "Another customer must get FORBIDDEN even when the window is closed.");
        Check(closedFixture.Changes.DeadlineReads == 0,
            "The window must not be read for a request that fails the ownership check.");

        var received = OldSpaAppointment(AppointmentStatus.Received, TimeSpan.FromMinutes(5));
        var receivedFixture = new ChangeFixture(received);
        var completed = OldHotelAppointment(AppointmentStatus.Completed, TimeSpan.FromHours(-3));
        var completedFixture = new ChangeFixture(completed);

        Check(await FailureCodeAsync(() => receivedFixture.ChangeService.CancelAsync(receivedFixture.Customer, received.AppointmentId)) == ErrorCodes.InvalidTransition,
            "A status a customer may not cancel must give INVALID_TRANSITION, not CHANGE_WINDOW_CLOSED.");
        Check(await FailureCodeAsync(() => completedFixture.ChangeService.CancelAsync(completedFixture.Customer, completed.AppointmentId)) == ErrorCodes.InvalidTransition,
            "A completed appointment in the past must give INVALID_TRANSITION, not CHANGE_WINDOW_CLOSED.");
    }),
    ("AppointmentChangeService.CancelAsync re-checks the window after the row lock", async () =>
    {
        var spaMovedCloser = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var spaFixture = new ChangeFixture(spaMovedCloser,
            beforeFindForUpdate: a => ((SpaAppointment)a).SlotStart = DateTimeOffset.UtcNow.AddMinutes(10));
        var hotelMovedCloser = OldHotelAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var hotelFixture = new ChangeFixture(hotelMovedCloser,
            beforeFindForUpdate: a => ((HotelAppointment)a).PlannedCheckIn = DateTimeOffset.UtcNow.AddMinutes(10));

        Check(await FailureCodeAsync(() => spaFixture.ChangeService.CancelAsync(spaFixture.Customer, spaMovedCloser.AppointmentId)) == ErrorCodes.ChangeWindowClosed,
            "A spa start that moved inside the window before the lock must be rejected with CHANGE_WINDOW_CLOSED.");
        Check(await FailureCodeAsync(() => hotelFixture.ChangeService.CancelAsync(hotelFixture.Customer, hotelMovedCloser.AppointmentId)) == ErrorCodes.ChangeWindowClosed,
            "A hotel check-in that moved inside the window before the lock must be rejected with CHANGE_WINDOW_CLOSED.");
        Check(spaMovedCloser.Status == AppointmentStatus.Confirmed && hotelMovedCloser.Status == AppointmentStatus.Confirmed
              && spaFixture.Changes.SavedCancellations.Count == 0 && hotelFixture.Changes.SavedCancellations.Count == 0,
            "Nothing may be changed or saved after a failed re-check.");
    }),
    ("A change or a cancel after the window closes is answered with 409 CHANGE_WINDOW_CLOSED and the hotline guidance", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromMinutes(30));
        var fixture = new ChangeFixture(appointment);

        var responses = new[]
        {
            await RunMiddlewareAsync(async _ => { await fixture.ChangeService.ChangeAsync(fixture.Customer, appointment.AppointmentId, fixture.SpaChange); }),
            await RunMiddlewareAsync(async _ => { await fixture.ChangeService.CancelAsync(fixture.Customer, appointment.AppointmentId); }),
        };

        foreach (var (status, body, contentType) in responses)
        {
            Check(status == 409 && contentType.StartsWith("application/problem+json"),
                "A closed window must be answered with 409 application/problem+json.");

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            Check(root.GetProperty("code").GetString() == ErrorCodes.ChangeWindowClosed,
                "The error code must be CHANGE_WINDOW_CLOSED.");
            Check(root.GetProperty("detail").GetString()!.Contains("hotline"),
                "The detail must tell the customer to contact the hotline.");
        }

        Check(appointment.Status == AppointmentStatus.Confirmed && fixture.Changes.SavedCancellations.Count == 0
              && fixture.Changes.SavedSpaServiceIds.Count == 0 && fixture.Guard.LockOrder.Count == 0,
            "Neither the change nor the cancel may touch the appointment after the window closes.");
    }),
    ("AppointmentsController.Cancel is a POST {id}/cancel restricted to the CustomerOrManager policy and returns the new status", async () =>
    {
        var method = typeof(AppointmentsController).GetMethod(nameof(AppointmentsController.Cancel));
        var post = method?.GetCustomAttributes(typeof(HttpPostAttribute), true).OfType<HttpPostAttribute>().FirstOrDefault();
        var authorize = method?.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), true)
            .OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().FirstOrDefault();

        Check(post?.Template == "{id}/cancel", "Cancel must be bound to POST {id}/cancel.");
        Check(authorize?.Policy == AuthorizationPolicies.CustomerOrManager, "Cancel must require the CustomerOrManager policy.");
        Check(method!.GetParameters().Select(p => p.ParameterType).SequenceEqual(new[] { typeof(Guid), typeof(CancelAppointmentRequest), typeof(CancellationToken) }),
            "Cancel must take the optional manager request body.");

        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new ChangeFixture(appointment);
        var controller = new AppointmentsController(null!, appointmentChangeService: fixture.ChangeService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, fixture.OwnerUserId.ToString()),
                        new Claim(TokenClaims.Role, "Customer"),
                    ], "test")),
                },
            },
        };

        var ok = await controller.Cancel(appointment.AppointmentId, null, CancellationToken.None) as OkObjectResult;

        Check(ok?.Value is AppointmentStatusResponse { Status: AppointmentStatus.Cancelled }
              && appointment.Status == AppointmentStatus.Cancelled,
            "Cancel must return 200 with status = Cancelled for the owner.");
    }),
    ("AppointmentInterventionService.RescheduleAsync moves a pending spa appointment and keeps it Pending", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment);

        var status = await fixture.Intervention.RescheduleAsync(fixture.Manager, appointment.AppointmentId, fixture.SpaChange());

        Check(status == AppointmentStatus.Pending && appointment.Status == AppointmentStatus.Pending,
            "A pending appointment must stay Pending.");
        Check(appointment.SlotStart == fixture.NewSlot && appointment.PetId == fixture.Pet.PetId
              && appointment.BusyUntil == fixture.NewSlot.AddMinutes(75),
            "The new schedule, pet and busy window must be applied.");
        Check(fixture.Changes.SavedSpaServiceIds.Count == 1 && fixture.Changes.SavedSpaServiceIds[0].Single() == fixture.ServiceId,
            "The chosen service must be saved.");
        Check(fixture.Assignments.Added.Count == 0, "A pending appointment must not receive staff rows.");
        Check(fixture.Guard.LockOrder.SequenceEqual(new[] { "lock-day", "lock-appointment" }),
            "The day lock must come before the appointment lock.");
        Check(fixture.Schedule.LastExcludeAppointmentId == appointment.AppointmentId,
            "The slot check must exclude the appointment itself.");
    }),
    ("AppointmentInterventionService.RescheduleAsync keeps a confirmed spa appointment Confirmed and rewrites its staff window", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment, holdsStaff: true);

        var status = await fixture.Intervention.RescheduleAsync(fixture.Manager, appointment.AppointmentId, fixture.SpaChange());

        var row = fixture.Assignments.Added.Single();
        Check(status == AppointmentStatus.Confirmed && appointment.Status == AppointmentStatus.Confirmed,
            "A confirmed appointment must stay Confirmed.");
        Check(row.StaffId == fixture.Staff.StaffId && row.BusyFrom == fixture.NewSlot && row.BusyUntil == appointment.BusyUntil && row.IsHolding,
            "The current staff must be kept with the new busy window.");
        Check(fixture.Assignments.LastExcludeAppointmentId == appointment.AppointmentId,
            "The staff conflict check must exclude the appointment itself.");
    }),
    ("AppointmentInterventionService.RescheduleAsync rejects everyone but a manager before reading anything", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment);

        foreach (var role in new[] { UserRole.Customer, UserRole.Staff })
        {
            var code = await FailureCodeAsync(() => fixture.Intervention.RescheduleAsync(
                new CurrentUser(Guid.NewGuid(), role), appointment.AppointmentId, fixture.SpaChange()));
            Check(code == ErrorCodes.Forbidden, $"{role} must be rejected with FORBIDDEN.");
        }

        Check(fixture.Guard.RunCalls == 0 && fixture.Changes.SavedSpaServiceIds.Count == 0 && appointment.SlotStart != fixture.NewSlot,
            "A rejected caller must not lock, change or save anything.");
    }),
    ("AppointmentInterventionService.RescheduleAsync rejects unknown appointments and statuses other than Pending and Confirmed", async () =>
    {
        var spa = OldSpaAppointment(AppointmentStatus.Received, TimeSpan.FromDays(5));
        var fixtureSpa = new InterventionFixture(spa);
        var codeReceived = await FailureCodeAsync(() => fixtureSpa.Intervention.RescheduleAsync(
            fixtureSpa.Manager, spa.AppointmentId, fixtureSpa.SpaChange()));
        Check(codeReceived == ErrorCodes.InvalidTransition, "Received must be rejected with InvalidTransition.");

        var hotel = OldHotelAppointment(AppointmentStatus.InStay, TimeSpan.FromDays(5));
        var fixtureHotel = new InterventionFixture(hotel);
        var codeInStay = await FailureCodeAsync(() => fixtureHotel.Intervention.RescheduleAsync(
            fixtureHotel.Manager, hotel.AppointmentId, fixtureHotel.HotelChange()));
        Check(codeInStay == ErrorCodes.InvalidTransition, "InStay must be rejected with InvalidTransition.");

        var fixtureNotFound = new InterventionFixture(OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5)));
        var codeNotFound = await FailureCodeAsync(() => fixtureNotFound.Intervention.RescheduleAsync(
            fixtureNotFound.Manager, Guid.NewGuid(), fixtureNotFound.SpaChange()));
        Check(codeNotFound == ErrorCodes.NotFound, "Unknown appointment must be rejected with NotFound.");

        Check(fixtureSpa.Guard.RunCalls == 0 && fixtureHotel.Guard.RunCalls == 0 && fixtureNotFound.Guard.RunCalls == 0,
            "RunCalls must be 0 for rejected appointments.");
    }),
    ("AppointmentInterventionService.RescheduleAsync does not apply the customer change window", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromMinutes(10));
        var fixture = new InterventionFixture(appointment, holdsStaff: true);

        var status = await fixture.Intervention.RescheduleAsync(fixture.Manager, appointment.AppointmentId, fixture.SpaChange());

        Check(status == AppointmentStatus.Confirmed && appointment.Status == AppointmentStatus.Confirmed,
            "A confirmed appointment must stay Confirmed even within the customer deadline.");
        Check(fixture.Changes.DeadlineReads == 0, "The manager flow must not read the change deadline.");
    }),
    ("AppointmentInterventionService.RescheduleAsync requires the fields of the appointment type and a pet of the same customer", async () =>
    {
        var spa = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixtureSpa = new InterventionFixture(spa);
        var changeMissingSlot = new ManagerAppointmentChange(fixtureSpa.Pet.PetId, null, [fixtureSpa.ServiceId], null, null, null, null, false);
        var codeSlot = await FailureCodeAsync(() => fixtureSpa.Intervention.RescheduleAsync(
            fixtureSpa.Manager, spa.AppointmentId, changeMissingSlot));
        Check(codeSlot == ErrorCodes.ValidationError, "Missing slotStart must yield ValidationError.");

        var changeEmptyServices = new ManagerAppointmentChange(fixtureSpa.Pet.PetId, fixtureSpa.NewSlot, [], null, null, null, null, false);
        var codeServices = await FailureCodeAsync(() => fixtureSpa.Intervention.RescheduleAsync(
            fixtureSpa.Manager, spa.AppointmentId, changeEmptyServices));
        Check(codeServices == ErrorCodes.ValidationError, "Empty serviceIds must yield ValidationError.");

        var hotel = OldHotelAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixtureHotel = new InterventionFixture(hotel);
        var changeMissingCheckout = new ManagerAppointmentChange(fixtureHotel.Pet.PetId, null, null, fixtureHotel.NewSlot, null, null, null, false);
        var codeCheckout = await FailureCodeAsync(() => fixtureHotel.Intervention.RescheduleAsync(
            fixtureHotel.Manager, hotel.AppointmentId, changeMissingCheckout));
        Check(codeCheckout == ErrorCodes.ValidationError, "Missing plannedCheckOut must yield ValidationError.");

        var fixtureOtherPet = new InterventionFixture(spa, petBelongsToOther: true);
        var codePet = await FailureCodeAsync(() => fixtureOtherPet.Intervention.RescheduleAsync(
            fixtureOtherPet.Manager, spa.AppointmentId, fixtureOtherPet.SpaChange()));
        Check(codePet == ErrorCodes.ValidationError, "Pet of another customer must yield ValidationError.");

        Check(fixtureSpa.Guard.RunCalls == 0 && fixtureHotel.Guard.RunCalls == 0 && fixtureOtherPet.Guard.RunCalls == 0,
            "Invalid fields or other customer's pet must not lock or run.");
        Check(fixtureSpa.Changes.SavedSpaServiceIds.Count == 0 && fixtureOtherPet.Changes.SavedSpaServiceIds.Count == 0,
            "Nothing must be saved.");
    }),
    ("AppointmentInterventionService.RescheduleAsync maps a full slot to SLOT_FULL and leaves the appointment unchanged", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment, slotIsHeld: true);
        var oldSlot = appointment.SlotStart;

        var code = await FailureCodeAsync(() => fixture.Intervention.RescheduleAsync(
            fixture.Manager, appointment.AppointmentId, fixture.SpaChange()));

        Check(code == ErrorCodes.SlotFull, "A held slot must return SlotFull.");
        Check(appointment.SlotStart == oldSlot, "Appointment slotStart must remain unchanged.");
        Check(fixture.Changes.SavedSpaServiceIds.Count == 0, "No changes must be saved.");
    }),
    ("AppointmentInterventionService.RescheduleAsync rejects staff given for a pending spa appointment", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment);

        var code = await FailureCodeAsync(() => fixture.Intervention.RescheduleAsync(
            fixture.Manager, appointment.AppointmentId, fixture.SpaChange(staffIds: [Guid.NewGuid()])));

        Check(code == ErrorCodes.ValidationError, "Staff provided for pending appointment must return ValidationError.");
        Check(fixture.Changes.SavedSpaServiceIds.Count == 0, "No changes must be saved.");
    }),
    ("AppointmentInterventionService.RescheduleAsync requires the staff count to match and the staff to be active", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment, holdsStaff: true);

        var codeMismatch = await FailureCodeAsync(() => fixture.Intervention.RescheduleAsync(
            fixture.Manager, appointment.AppointmentId, fixture.SpaChange(staffIds: [Guid.NewGuid(), Guid.NewGuid()])));
        Check(codeMismatch == ErrorCodes.StaffCountMismatch, "Wrong staff count must return StaffCountMismatch.");

        var codeInactive = await FailureCodeAsync(() => fixture.Intervention.RescheduleAsync(
            fixture.Manager, appointment.AppointmentId, fixture.SpaChange(staffIds: [Guid.NewGuid()])));
        Check(codeInactive == ErrorCodes.ValidationError, "Inactive or non-existent staff must return ValidationError.");

        Check(fixture.Assignments.Added.Count == 0, "No assignments must be added.");
    }),
    ("AppointmentInterventionService.RescheduleAsync maps a busy staff to STAFF_CONFLICT", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment, holdsStaff: true, busyForStaff: true);

        var code = await FailureCodeAsync(() => fixture.Intervention.RescheduleAsync(
            fixture.Manager, appointment.AppointmentId, fixture.SpaChange()));

        Check(code == ErrorCodes.StaffConflict, "Busy staff must return StaffConflict.");
        Check(fixture.Assignments.Added.Count == 0, "No assignments must be added.");
        Check(fixture.Changes.SavedSpaServiceIds.Count == 0, "No changes must be saved.");
    }),
    ("AppointmentInterventionService.RescheduleAsync requires confirmOutOfShift for staff without a shift", async () =>
    {
        var appointment1 = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture1 = new InterventionFixture(appointment1, holdsStaff: true, staffInShift: false);

        var code = await FailureCodeAsync(() => fixture1.Intervention.RescheduleAsync(
            fixture1.Manager, appointment1.AppointmentId, fixture1.SpaChange()));
        Check(code == ErrorCodes.StaffOutOfShift, "Out of shift staff without confirm must return StaffOutOfShift.");

        var appointment2 = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture2 = new InterventionFixture(appointment2, holdsStaff: true, staffInShift: false);

        var status = await fixture2.Intervention.RescheduleAsync(
            fixture2.Manager, appointment2.AppointmentId, fixture2.SpaChange(confirmOutOfShift: true));
        Check(status == AppointmentStatus.Confirmed && appointment2.Status == AppointmentStatus.Confirmed,
            "Confirmed appointment with confirmOutOfShift=true must succeed and stay Confirmed.");
    }),
    ("AppointmentInterventionService.RescheduleAsync replaces the staff of a confirmed spa appointment with the staff chosen by the manager", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment, holdsStaff: true);

        var status = await fixture.Intervention.RescheduleAsync(
            fixture.Manager, appointment.AppointmentId, fixture.SpaChange(staffIds: [fixture.Staff.StaffId]));

        Check(status == AppointmentStatus.Confirmed, "Status must remain Confirmed.");
        Check(fixture.Assignments.Added.Single().StaffId == fixture.Staff.StaffId,
            "The chosen staff must be assigned.");
    }),
    ("AppointmentInterventionService.RescheduleAsync moves a hotel appointment and keeps its status", async () =>
    {
        var pendingHotel = OldHotelAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixturePending = new InterventionFixture(pendingHotel);

        var statusPending = await fixturePending.Intervention.RescheduleAsync(
            fixturePending.Manager, pendingHotel.AppointmentId, fixturePending.HotelChange());
        Check(statusPending == AppointmentStatus.Pending && pendingHotel.Status == AppointmentStatus.Pending,
            "Pending hotel appointment must stay Pending.");
        Check(pendingHotel.PlannedCheckIn == fixturePending.NewSlot && pendingHotel.PlannedCheckOut == fixturePending.NewCheckOut,
            "Schedule must be updated for pending hotel appointment.");
        Check(fixturePending.Guard.LockOrder.SequenceEqual(new[] { "lock-hotel-group", "lock-appointment" }),
            "Lock order must be lock-hotel-group then lock-appointment.");
        Check(fixturePending.Changes.SavedHotelChanges == 1, "Hotel change must be saved once.");

        var confirmedHotel = OldHotelAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixtureConfirmed = new InterventionFixture(confirmedHotel);
        confirmedHotel.CageId = fixtureConfirmed.Cage.CageId;

        var statusConfirmed = await fixtureConfirmed.Intervention.RescheduleAsync(
            fixtureConfirmed.Manager, confirmedHotel.AppointmentId, fixtureConfirmed.HotelChange());
        Check(statusConfirmed == AppointmentStatus.Confirmed && confirmedHotel.Status == AppointmentStatus.Confirmed,
            "Confirmed hotel appointment must stay Confirmed.");
        Check(confirmedHotel.CageId == fixtureConfirmed.Cage.CageId,
            "Cage must remain the same for confirmed hotel appointment.");
        Check(fixtureConfirmed.Changes.SavedHotelChanges == 1, "Hotel change must be saved once.");
    }),
    ("AppointmentInterventionService.RescheduleAsync ignores the stay window of the appointment itself when checking its cage", async () =>
    {
        var appointment = OldHotelAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment);
        appointment.CageId = fixture.Cage.CageId;
        fixture.CageWindows.Add(new CageStayWindow(fixture.Cage.CageId, fixture.NewSlot, fixture.NewCheckOut, appointment.AppointmentId));

        var status = await fixture.Intervention.RescheduleAsync(fixture.Manager, appointment.AppointmentId, fixture.HotelChange());

        Check(status == AppointmentStatus.Confirmed && appointment.Status == AppointmentStatus.Confirmed,
            "Stay window of the appointment itself must be ignored.");
        Check(appointment.CageId == fixture.Cage.CageId, "Cage must remain unchanged.");
    }),
    ("AppointmentInterventionService.RescheduleAsync maps an occupied cage to CAGE_CONFLICT", async () =>
    {
        var appointment = OldHotelAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment);
        appointment.CageId = fixture.Cage.CageId;
        fixture.CageWindows.Add(new CageStayWindow(fixture.Cage.CageId, fixture.NewSlot, fixture.NewCheckOut, Guid.NewGuid()));

        var code = await FailureCodeAsync(() => fixture.Intervention.RescheduleAsync(
            fixture.Manager, appointment.AppointmentId, fixture.HotelChange()));

        Check(code == ErrorCodes.CageConflict, "Occupied cage by another appointment must return CageConflict.");
        Check(fixture.Changes.SavedHotelChanges == 0, "No hotel changes must be saved.");
    }),
    ("AppointmentInterventionService.RescheduleAsync maps a full hotel group to NO_CAPACITY and rejects cage fields that do not fit", async () =>
    {
        var hotelFull = OldHotelAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixtureFull = new InterventionFixture(hotelFull, hotelIsFull: true);
        var codeFull = await FailureCodeAsync(() => fixtureFull.Intervention.RescheduleAsync(
            fixtureFull.Manager, hotelFull.AppointmentId, fixtureFull.HotelChange()));
        Check(codeFull == ErrorCodes.NoCapacity, "Full hotel must return NoCapacity.");
        Check(fixtureFull.Changes.SavedHotelChanges == 0, "No changes must be saved.");

        var hotelPending = OldHotelAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixturePending = new InterventionFixture(hotelPending);
        var codeCageOnPending = await FailureCodeAsync(() => fixturePending.Intervention.RescheduleAsync(
            fixturePending.Manager, hotelPending.AppointmentId, fixturePending.HotelChange(cageId: Guid.NewGuid())));
        Check(codeCageOnPending == ErrorCodes.ValidationError, "Cage specified on pending appointment must return ValidationError.");
        Check(fixturePending.Changes.SavedHotelChanges == 0, "No changes must be saved.");

        var hotelConfirmed = OldHotelAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixtureConfirmed = new InterventionFixture(hotelConfirmed);
        var codeUnknownCage = await FailureCodeAsync(() => fixtureConfirmed.Intervention.RescheduleAsync(
            fixtureConfirmed.Manager, hotelConfirmed.AppointmentId, fixtureConfirmed.HotelChange(cageId: Guid.NewGuid())));
        Check(codeUnknownCage == ErrorCodes.NotFound, "Unknown cage must return NotFound.");
        Check(fixtureConfirmed.Changes.SavedHotelChanges == 0, "No changes must be saved.");

        var hotelWrongSize = OldHotelAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixtureWrongSize = new InterventionFixture(hotelWrongSize);
        hotelWrongSize.CageId = fixtureWrongSize.Cage.CageId;
        fixtureWrongSize.Cage.SizeGroup = SizeGroup.Large;
        var codeWrongSize = await FailureCodeAsync(() => fixtureWrongSize.Intervention.RescheduleAsync(
            fixtureWrongSize.Manager, hotelWrongSize.AppointmentId, fixtureWrongSize.HotelChange()));
        Check(codeWrongSize == ErrorCodes.CageConflict, "Mismatching cage size must return CageConflict.");
        Check(fixtureWrongSize.Changes.SavedHotelChanges == 0, "No changes must be saved.");
    }),
    ("AppointmentInterventionService.RescheduleAsync re-checks the status after the row lock", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(appointment, beforeFindForUpdate: a => a.Status = AppointmentStatus.Received);

        var code = await FailureCodeAsync(() => fixture.Intervention.RescheduleAsync(
            fixture.Manager, appointment.AppointmentId, fixture.SpaChange()));

        Check(code == ErrorCodes.InvalidTransition, "Status change under lock must yield InvalidTransition.");
        Check(fixture.Changes.SavedSpaServiceIds.Count == 0, "No changes must be saved.");
    }),
    ("StaffService.DeactivateAsync returns every Confirmed spa appointment of the staff to Pending, deletes all its staff rows and notifies account-owning customers after the transaction", async () =>
    {
        var staffId = Guid.NewGuid();
        var otherStaffId = Guid.NewGuid();
        var customerUserId = Guid.NewGuid();
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var firstId = new Guid("00000000-0000-0000-0000-000000000001");
        var secondId = new Guid("00000000-0000-0000-0000-000000000002");
        var untouchedId = Guid.NewGuid();

        SpaAppointment Confirmed(Guid id, short staffRequired) => new()
        {
            AppointmentId = id,
            Status = AppointmentStatus.Confirmed,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(60),
            BusyUntil = slotStart.AddMinutes(75),
            StaffRequired = staffRequired,
        };

        AppointmentStaff Row(Guid appointmentId, Guid rowStaffId) => new()
        {
            AppointmentId = appointmentId,
            StaffId = rowStaffId,
            BusyFrom = slotStart,
            BusyUntil = slotStart.AddMinutes(75),
            IsHolding = true,
            AssignedAt = DateTimeOffset.UtcNow,
        };

        var first = Confirmed(firstId, 2);
        var second = Confirmed(secondId, 1);
        var assignments = new TestAssignmentRepo(first, [], [], new Dictionary<Guid, int>());
        assignments.Others.Add(second);
        assignments.Added.AddRange(new[]
        {
            Row(firstId, staffId), Row(firstId, otherStaffId), Row(secondId, staffId), Row(untouchedId, otherStaffId),
        });

        var staffRepo = new TestStaffRepo(
        [
            new StaffConfirmedSpaAssignment(firstId, customerUserId),
            new StaffConfirmedSpaAssignment(secondId, null),
        ]);
        var guard = new TrackingConcurrencyGuard();
        var notificationRepo = new TestNotificationRepo(() => guard.InsideRun);
        var zone = TimeZoneInfo.CreateCustomTimeZone("UTC+7", TimeSpan.FromHours(7), "UTC+7", "UTC+7");
        var service = new StaffService(
            staffRepo, assignments, guard, new NotificationService(notificationRepo), new ShopTimeZone(zone));

        var returned = await service.DeactivateAsync(staffId);

        Check(returned == 2, "Both Confirmed spa appointments of the staff must be counted.");
        Check(first.Status == AppointmentStatus.Pending && second.Status == AppointmentStatus.Pending,
            "Both appointments must return to Pending.");
        Check(assignments.Added.Count == 1 && assignments.Added[0].AppointmentId == untouchedId,
            "All staff rows of the returned appointments must be deleted and other appointments must stay untouched.");
        Check(staffRepo.DeactivateCalls == 1, "The staff account must be deactivated exactly once.");
        Check(guard.RunCalls == 1, "Everything must run inside one concurrency guard transaction.");
        Check(guard.LockedAppointments.SequenceEqual(new[] { firstId, secondId }),
            "Appointments must be locked one by one in the listed order.");
        Check(notificationRepo.Created.Count == 1, "Only the customer who owns an account must be notified.");

        var notice = notificationRepo.Created[0];
        Check(notice.RecipientUserId == customerUserId
              && notice.Type == NotificationType.StatusChanged
              && notice.AppointmentId == firstId,
            "The notice must be a StatusChanged notification of the first appointment for its customer account.");
        Check(notice.Message.Contains("10:00 ngày 20/11/2026") && notice.Message.Contains("Chờ xác nhận"),
            "The message must show the shop-local appointment time and the Pending status.");
        Check(!notice.InsideTransaction, "Notifications must be created after the transaction has ended.");
    }),
    ("StaffService.DeactivateAsync skips an appointment that is no longer Confirmed or assigned to the staff once its row is locked", async () =>
    {
        var staffId = Guid.NewGuid();
        var customerUserId = Guid.NewGuid();
        var slotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var keptId = new Guid("00000000-0000-0000-0000-000000000001");
        var staleId = new Guid("00000000-0000-0000-0000-000000000002");

        SpaAppointment Confirmed(Guid id) => new()
        {
            AppointmentId = id,
            Status = AppointmentStatus.Confirmed,
            SlotStart = slotStart,
            SlotEnd = slotStart.AddMinutes(60),
            BusyUntil = slotStart.AddMinutes(75),
            StaffRequired = 1,
        };

        AppointmentStaff Row(Guid appointmentId, Guid rowStaffId) => new()
        {
            AppointmentId = appointmentId,
            StaffId = rowStaffId,
            BusyFrom = slotStart,
            BusyUntil = slotStart.AddMinutes(75),
            IsHolding = true,
            AssignedAt = DateTimeOffset.UtcNow,
        };

        var kept = Confirmed(keptId);
        var stale = Confirmed(staleId);
        var assignments = new TestAssignmentRepo(kept, [], [], new Dictionary<Guid, int>());
        assignments.Others.Add(stale);
        assignments.Added.AddRange(new[] { Row(keptId, staffId), Row(staleId, Guid.NewGuid()) });

        var staffRepo = new TestStaffRepo(
        [
            new StaffConfirmedSpaAssignment(keptId, customerUserId),
            new StaffConfirmedSpaAssignment(staleId, customerUserId),
        ])
        {
            StillAssigned = id => id == keptId,
        };
        var guard = new TrackingConcurrencyGuard();
        var notificationRepo = new TestNotificationRepo(() => guard.InsideRun);
        var service = new StaffService(
            staffRepo, assignments, guard, new NotificationService(notificationRepo), new ShopTimeZone(TimeZoneInfo.Utc));

        var returned = await service.DeactivateAsync(staffId);

        Check(returned == 1, "Only the appointment that still qualifies after locking must be counted.");
        Check(kept.Status == AppointmentStatus.Pending, "The qualifying appointment must return to Pending.");
        Check(stale.Status == AppointmentStatus.Confirmed, "A stale appointment must stay Confirmed.");
        Check(assignments.Added.Count == 1 && assignments.Added[0].AppointmentId == staleId,
            "A stale appointment must keep its staff rows.");
        Check(guard.LockedAppointments.Count == 2, "Both listed appointments must be locked before being re-read.");
        Check(notificationRepo.Created.Count == 1 && notificationRepo.Created[0].AppointmentId == keptId,
            "Only the returned appointment must produce a notification.");
    }),
    ("StaffService.DeactivateAsync deactivates a staff member with no Confirmed spa appointment and returns 0 without notifications", async () =>
    {
        var assignments = new TestAssignmentRepo(null, [], [], new Dictionary<Guid, int>());
        var staffRepo = new TestStaffRepo([]);
        var guard = new TrackingConcurrencyGuard();
        var notificationRepo = new TestNotificationRepo(() => guard.InsideRun);
        var service = new StaffService(
            staffRepo, assignments, guard, new NotificationService(notificationRepo), new ShopTimeZone(TimeZoneInfo.Utc));

        var returned = await service.DeactivateAsync(Guid.NewGuid());

        Check(returned == 0, "Nothing must be counted when the staff has no Confirmed spa appointment.");
        Check(staffRepo.DeactivateCalls == 1, "The account must still be deactivated.");
        Check(guard.RunCalls == 1 && guard.LockedAppointments.Count == 0, "No appointment must be locked.");
        Check(notificationRepo.Created.Count == 0 && assignments.SaveCalls == 0,
            "Nothing must be saved or notified.");
    }),
    ("StaffService.DeactivateAsync rejects an unknown staff member with NOT_FOUND before touching any appointment or notification", async () =>
    {
        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Confirmed,
            SlotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero),
            StaffRequired = 1,
        };
        var assignments = new TestAssignmentRepo(appointment, [], [], new Dictionary<Guid, int>());
        var staffRepo = new TestStaffRepo([new StaffConfirmedSpaAssignment(appointment.AppointmentId, Guid.NewGuid())])
        {
            StaffExists = false,
        };
        var guard = new TrackingConcurrencyGuard();
        var notificationRepo = new TestNotificationRepo(() => guard.InsideRun);
        var service = new StaffService(
            staffRepo, assignments, guard, new NotificationService(notificationRepo), new ShopTimeZone(TimeZoneInfo.Utc));

        var code = await FailureCodeAsync(() => service.DeactivateAsync(Guid.NewGuid()));

        Check(code == ErrorCodes.NotFound, "An unknown staff member must be rejected with NotFound.");
        Check(appointment.Status == AppointmentStatus.Confirmed, "The appointment must not change.");
        Check(guard.LockedAppointments.Count == 0 && assignments.SaveCalls == 0 && notificationRepo.Created.Count == 0,
            "Nothing must be locked, saved or notified.");
    }),
    ("AppointmentNotifier.BookingReceivedAsync notifies the customer account of a spa and a hotel appointment", async () =>
    {
        var zone = TimeZoneInfo.CreateCustomTimeZone("UTC+7", TimeSpan.FromHours(7), "UTC+7", "UTC+7");
        var shopZone = new ShopTimeZone(zone);
        var repo = new TestNotificationRepo(() => false);
        var customerUserId = Guid.NewGuid();

        var spa = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        spa.SlotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var staffUserIds = new[] { Guid.NewGuid() };
        var readerSpa = new TestAppointmentNotificationReader(_ => new AppointmentNotificationContext(spa, customerUserId, staffUserIds));
        var notifierSpa = new AppointmentNotifier(readerSpa, new NotificationService(repo), shopZone);

        await notifierSpa.BookingReceivedAsync(spa.AppointmentId);

        Check(repo.Created.Count == 1, "Only 1 notification must be created for spa booking.");
        Check(repo.Created[0].Type == NotificationType.BookingReceived, "Type must be BookingReceived.");
        Check(repo.Created[0].RecipientUserId == customerUserId, "Recipient must be CustomerUserId.");
        Check(repo.Created[0].AppointmentId == spa.AppointmentId, "AppointmentId must match.");
        Check(repo.Created[0].Message == "Lịch spa lúc 10:00 ngày 20/11/2026 đã được ghi nhận và đang chờ cửa hàng xác nhận.",
            "Spa message must match template.");

        var hotel = OldHotelAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        hotel.PlannedCheckIn = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        hotel.PlannedCheckOut = new DateTimeOffset(2026, 11, 22, 3, 0, 0, TimeSpan.Zero);
        var readerHotel = new TestAppointmentNotificationReader(_ => new AppointmentNotificationContext(hotel, customerUserId, []));
        var notifierHotel = new AppointmentNotifier(readerHotel, new NotificationService(repo), shopZone);

        await notifierHotel.BookingReceivedAsync(hotel.AppointmentId);

        Check(repo.Created.Count == 2, "A second notification must be created for hotel booking.");
        Check(repo.Created[1].Type == NotificationType.BookingReceived, "Type must be BookingReceived.");
        Check(repo.Created[1].RecipientUserId == customerUserId, "Recipient must be CustomerUserId.");
        Check(repo.Created[1].AppointmentId == hotel.AppointmentId, "AppointmentId must match.");
        Check(repo.Created[1].Message == "Lịch lưu trú từ ngày 20/11/2026 đến ngày 22/11/2026 đã được ghi nhận và đang chờ cửa hàng xác nhận.",
            "Hotel message must match template.");
    }),
    ("AppointmentNotifier skips walk-in customers and unknown appointments", async () =>
    {
        var zone = TimeZoneInfo.CreateCustomTimeZone("UTC+7", TimeSpan.FromHours(7), "UTC+7", "UTC+7");
        var shopZone = new ShopTimeZone(zone);
        var repo = new TestNotificationRepo(() => false);

        var spa = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        spa.SlotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        spa.CancelReason = CancelReason.StoreUnable;
        var walkInReader = new TestAppointmentNotificationReader(_ => new AppointmentNotificationContext(spa, null, []));
        var walkInNotifier = new AppointmentNotifier(walkInReader, new NotificationService(repo), shopZone);

        await walkInNotifier.BookingReceivedAsync(spa.AppointmentId);
        await walkInNotifier.ConfirmedAsync(spa.AppointmentId);
        await walkInNotifier.CancelledAsync(spa.AppointmentId);

        Check(repo.Created.Count == 0, "No notifications for walk-in customer with no staff.");

        var nullReader = new TestAppointmentNotificationReader(_ => null);
        var nullNotifier = new AppointmentNotifier(nullReader, new NotificationService(repo), shopZone);

        await nullNotifier.BookingReceivedAsync(Guid.NewGuid());
        await nullNotifier.ConfirmedAsync(Guid.NewGuid());
        await nullNotifier.CancelledAsync(Guid.NewGuid());

        Check(repo.Created.Count == 0, "No notifications for unknown appointment.");
    }),
    ("AppointmentNotifier.ConfirmedAsync notifies the customer and every assigned staff member", async () =>
    {
        var zone = TimeZoneInfo.CreateCustomTimeZone("UTC+7", TimeSpan.FromHours(7), "UTC+7", "UTC+7");
        var shopZone = new ShopTimeZone(zone);
        var repo = new TestNotificationRepo(() => false);
        var customerUserId = Guid.NewGuid();
        var staff1 = Guid.NewGuid();
        var staff2 = Guid.NewGuid();

        var spa = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        spa.SlotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        var readerSpa = new TestAppointmentNotificationReader(_ => new AppointmentNotificationContext(spa, customerUserId, [staff1, staff2]));
        var notifierSpa = new AppointmentNotifier(readerSpa, new NotificationService(repo), shopZone);

        await notifierSpa.ConfirmedAsync(spa.AppointmentId);

        Check(repo.Created.Count == 3, "3 notifications must be created (1 customer + 2 staff).");
        Check(repo.Created.All(n => n.Type == NotificationType.ConfirmedAssigned), "All must be ConfirmedAssigned.");
        Check(repo.Created[0].RecipientUserId == customerUserId && repo.Created[0].Message == "Lịch spa lúc 10:00 ngày 20/11/2026 đã được cửa hàng xác nhận.",
            "Customer message must match.");
        Check(repo.Created[1].RecipientUserId == staff1 && repo.Created[1].Message == "Lịch spa lúc 10:00 ngày 20/11/2026 đã được phân công cho bạn.",
            "Staff 1 message must match.");
        Check(repo.Created[2].RecipientUserId == staff2 && repo.Created[2].Message == "Lịch spa lúc 10:00 ngày 20/11/2026 đã được phân công cho bạn.",
            "Staff 2 message must match.");

        var hotel = OldHotelAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        hotel.PlannedCheckIn = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        hotel.PlannedCheckOut = new DateTimeOffset(2026, 11, 22, 3, 0, 0, TimeSpan.Zero);
        var readerHotel = new TestAppointmentNotificationReader(_ => new AppointmentNotificationContext(hotel, customerUserId, []));
        var notifierHotel = new AppointmentNotifier(readerHotel, new NotificationService(repo), shopZone);

        await notifierHotel.ConfirmedAsync(hotel.AppointmentId);

        Check(repo.Created.Count == 4, "Hotel confirmation creates 1 notification for customer.");
        Check(repo.Created[3].RecipientUserId == customerUserId && repo.Created[3].Message == "Lịch lưu trú từ ngày 20/11/2026 đến ngày 22/11/2026 đã được cửa hàng xác nhận.",
            "Hotel customer message must match.");
    }),
    ("AppointmentNotifier.CancelledAsync notifies the customer and the staff in charge with the reason", async () =>
    {
        var zone = TimeZoneInfo.CreateCustomTimeZone("UTC+7", TimeSpan.FromHours(7), "UTC+7", "UTC+7");
        var shopZone = new ShopTimeZone(zone);
        var customerUserId = Guid.NewGuid();
        var staffUserId = Guid.NewGuid();

        var reasonCases = new (CancelReason reason, string expectedFragment)[]
        {
            (CancelReason.StoreUnable, "Lý do: cửa hàng không thể đáp ứng."),
            (CancelReason.CustomerCancelled, "Lý do: khách hàng chủ động hủy."),
            (CancelReason.CustomerBeyondDeadline, "Lý do: theo yêu cầu của khách hàng ngoài thời hạn tự phục vụ."),
        };

        foreach (var (reason, expectedFragment) in reasonCases)
        {
            var repo = new TestNotificationRepo(() => false);
            var spa = OldSpaAppointment(AppointmentStatus.Cancelled, TimeSpan.FromDays(5));
            spa.SlotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
            spa.CancelReason = reason;

            var reader = new TestAppointmentNotificationReader(_ => new AppointmentNotificationContext(spa, customerUserId, [staffUserId]));
            var notifier = new AppointmentNotifier(reader, new NotificationService(repo), shopZone);

            await notifier.CancelledAsync(spa.AppointmentId);

            Check(repo.Created.Count == 2, "Customer and assigned staff must be notified of cancellation.");
            Check(repo.Created[0].RecipientUserId == customerUserId && repo.Created[0].Type == NotificationType.Cancelled,
                "Customer must receive Cancelled notice.");
            Check(repo.Created[0].Message.Contains(expectedFragment), $"Customer message must contain '{expectedFragment}'.");
            Check(repo.Created[1].RecipientUserId == staffUserId && repo.Created[1].Type == NotificationType.Cancelled,
                "Staff must receive Cancelled notice.");
            Check(repo.Created[1].Message == $"Lịch spa lúc 10:00 ngày 20/11/2026 do bạn phụ trách đã bị hủy. {expectedFragment}",
                "Staff message must match template.");
        }

        var unassignedRepo = new TestNotificationRepo(() => false);
        var unassignedSpa = OldSpaAppointment(AppointmentStatus.Cancelled, TimeSpan.FromDays(5));
        unassignedSpa.SlotStart = new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
        unassignedSpa.CancelReason = CancelReason.StoreUnable;
        var unassignedReader = new TestAppointmentNotificationReader(_ => new AppointmentNotificationContext(unassignedSpa, customerUserId, []));
        var unassignedNotifier = new AppointmentNotifier(unassignedReader, new NotificationService(unassignedRepo), shopZone);

        await unassignedNotifier.CancelledAsync(unassignedSpa.AppointmentId);

        Check(unassignedRepo.Created.Count == 1, "Only customer receives notice when no staff assigned.");
    }),
    ("AppointmentNotifier.CancelledAsync fails loudly for a missing or unsupported reason", async () =>
    {
        var zone = TimeZoneInfo.CreateCustomTimeZone("UTC+7", TimeSpan.FromHours(7), "UTC+7", "UTC+7");
        var shopZone = new ShopTimeZone(zone);
        var repo = new TestNotificationRepo(() => false);
        var customerUserId = Guid.NewGuid();

        var spaNullReason = OldSpaAppointment(AppointmentStatus.Cancelled, TimeSpan.FromDays(5));
        spaNullReason.CancelReason = null;
        var readerNull = new TestAppointmentNotificationReader(_ => new AppointmentNotificationContext(spaNullReason, customerUserId, []));
        var notifierNull = new AppointmentNotifier(readerNull, new NotificationService(repo), shopZone);

        var nullThrew = false;
        try
        {
            await notifierNull.CancelledAsync(spaNullReason.AppointmentId);
        }
        catch (InvalidOperationException)
        {
            nullThrew = true;
        }
        Check(nullThrew, "Missing cancel reason must throw InvalidOperationException.");
        Check(repo.Created.Count == 0, "No notification created on missing cancel reason.");

        var spaNoShow = OldSpaAppointment(AppointmentStatus.Cancelled, TimeSpan.FromDays(5));
        spaNoShow.CancelReason = CancelReason.NoShow;
        var readerNoShow = new TestAppointmentNotificationReader(_ => new AppointmentNotificationContext(spaNoShow, customerUserId, []));
        var notifierNoShow = new AppointmentNotifier(readerNoShow, new NotificationService(repo), shopZone);

        var noShowThrew = false;
        try
        {
            await notifierNoShow.CancelledAsync(spaNoShow.AppointmentId);
        }
        catch (InvalidOperationException)
        {
            noShowThrew = true;
        }
        Check(noShowThrew, "Unsupported cancel reason must throw InvalidOperationException.");
        Check(repo.Created.Count == 0, "No notification created on unsupported cancel reason.");
    }),
    ("BookingService.CreateSpaAppointmentAsync notifies the customer account after the transaction", async () =>
    {
        var customerId = Guid.NewGuid();
        var customerUserId = Guid.NewGuid();
        var petId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();
        var pet = new Pet { PetId = petId, CustomerId = customerId, Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };
        var service = new Service { ServiceId = serviceId, Name = "Tắm", LatestStartTime = new TimeOnly(18, 0), IsActive = true };
        var pricing = new ServicePricing { ServiceId = serviceId, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 100000, DurationMinutes = 60, StaffRequired = 1 };
        var slotTimes = new List<TimeOnly> { new(10, 0) };
        var futureDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var validSlot = new DateTimeOffset(futureDate.ToDateTime(new TimeOnly(10, 0)), TimeSpan.Zero);
        var shifts = new List<StaffShiftWindow> { new(Guid.NewGuid(), validSlot.AddHours(-1), validSlot.AddHours(3)) };

        var serviceWithPricing = new ServiceWithPricing(service, [pricing]);
        var scheduleRepo = new TestScheduleRepo(15, isLocked: false, shifts, []);
        var guard = new TestConcurrencyGuard();
        var notificationRepo = new TestNotificationRepo(() => guard.InsideRun);
        var reader = new TestAppointmentNotificationReader(id =>
        {
            var spa = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(1));
            spa.AppointmentId = id;
            spa.SlotStart = validSlot;
            return new AppointmentNotificationContext(spa, customerUserId, []);
        });
        var notifier = new AppointmentNotifier(reader, new NotificationService(notificationRepo), new ShopTimeZone(TimeZoneInfo.Utc));

        var bookingService = new BookingService(
            new TestPetRepo(pet, customerUserId),
            new TestStaffRoleReader(null),
            new TestCatalogRepo(serviceWithPricing, slotTimes),
            scheduleRepo,
            guard,
            new ShopTimeZone(TimeZoneInfo.Utc),
            notifier);

        var user = new CurrentUser(customerUserId, UserRole.Customer);
        var result = await bookingService.CreateSpaAppointmentAsync(user, null, petId, [serviceId], validSlot);

        Check(notificationRepo.Created.Count == 1, "Exactly 1 notification must be created.");
        Check(notificationRepo.Created[0].Type == NotificationType.BookingReceived, "Type must be BookingReceived.");
        Check(notificationRepo.Created[0].RecipientUserId == customerUserId, "Recipient must be customerUserId.");
        Check(notificationRepo.Created[0].AppointmentId == result.Appointment.AppointmentId, "AppointmentId must match.");
        Check(!notificationRepo.Created[0].InsideTransaction, "Notification must be sent outside transaction.");
        Check(reader.Requested.Count == 1 && reader.Requested[0] == result.Appointment.AppointmentId, "Reader must be called for created appointment.");
    }),
    ("BookingService.CreateSpaAppointmentAsync sends nothing for a walk-in customer and when the booking is rejected", async () =>
    {
        var customerId = Guid.NewGuid();
        var petId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();
        var pet = new Pet { PetId = petId, CustomerId = customerId, Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };
        var service = new Service { ServiceId = serviceId, Name = "Tắm", LatestStartTime = new TimeOnly(18, 0), IsActive = true };
        var pricing = new ServicePricing { ServiceId = serviceId, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 100000, DurationMinutes = 60, StaffRequired = 1 };
        var slotTimes = new List<TimeOnly> { new(10, 0) };
        var futureDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var validSlot = new DateTimeOffset(futureDate.ToDateTime(new TimeOnly(10, 0)), TimeSpan.Zero);
        var shifts = new List<StaffShiftWindow> { new(Guid.NewGuid(), validSlot.AddHours(-1), validSlot.AddHours(3)) };

        var serviceWithPricing = new ServiceWithPricing(service, [pricing]);
        var scheduleRepo = new TestScheduleRepo(15, isLocked: false, shifts, []);
        var guard = new TestConcurrencyGuard();
        var notificationRepo = new TestNotificationRepo(() => guard.InsideRun);
        var reader = new TestAppointmentNotificationReader(id =>
        {
            var spa = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(1));
            spa.AppointmentId = id;
            return new AppointmentNotificationContext(spa, null, []);
        });
        var notifier = new AppointmentNotifier(reader, new NotificationService(notificationRepo), new ShopTimeZone(TimeZoneInfo.Utc));

        var bookingService = new BookingService(
            new TestPetRepo(pet, null),
            new TestStaffRoleReader(StaffRole.Receptionist),
            new TestCatalogRepo(serviceWithPricing, slotTimes),
            scheduleRepo,
            guard,
            new ShopTimeZone(TimeZoneInfo.Utc),
            notifier);

        var receptionist = new CurrentUser(Guid.NewGuid(), UserRole.Staff);
        await bookingService.CreateSpaAppointmentAsync(receptionist, customerId, petId, [serviceId], validSlot);

        Check(notificationRepo.Created.Count == 0, "No notifications for walk-in customer.");

        var fullBookingService = new BookingService(
            new TestPetRepo(pet, Guid.NewGuid()),
            new TestStaffRoleReader(null),
            new TestCatalogRepo(serviceWithPricing, slotTimes),
            new TestScheduleRepo(15, isLocked: false, shifts: [], held: []),
            guard,
            new ShopTimeZone(TimeZoneInfo.Utc),
            notifier);

        reader.Requested.Clear();
        await FailureCodeAsync(() => fullBookingService.CreateSpaAppointmentAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Customer), null, petId, [serviceId], validSlot));

        Check(reader.Requested.Count == 0 && notificationRepo.Created.Count == 0,
            "No notification or reader call when booking rejected with SLOT_FULL.");
    }),
    ("HotelBookingService.CreateHotelAppointmentAsync notifies the customer account after the transaction", async () =>
    {
        var ownerUserId = Guid.NewGuid();
        var pet = new Pet { PetId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };
        var repo = new TestHotelBookingRepo(2, []);
        var guard = new TestConcurrencyGuard();
        var notificationRepo = new TestNotificationRepo(() => guard.InsideRun);
        var reader = new TestAppointmentNotificationReader(id =>
        {
            var hotel = OldHotelAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(1));
            hotel.AppointmentId = id;
            return new AppointmentNotificationContext(hotel, ownerUserId, []);
        });
        var notifier = new AppointmentNotifier(reader, new NotificationService(notificationRepo), new ShopTimeZone(TimeZoneInfo.Utc));

        var service = new HotelBookingService(
            new TestPetRepo(pet, ownerUserId),
            new TestStaffRoleReader(null),
            repo,
            new TestHotelCatalogRepo
            {
                Prices = [new HotelPricing { Species = Species.Dog, SizeGroup = SizeGroup.Small, PricePerNight = 100000m, FoodPerNight = 20000m }],
            },
            new ShopTimeZone(TimeZoneInfo.Utc),
            guard,
            notifier);

        var checkIn = DateTimeOffset.UtcNow.AddDays(2);
        var checkOut = checkIn.AddDays(2);
        var user = new CurrentUser(ownerUserId, UserRole.Customer);
        var result = await service.CreateHotelAppointmentAsync(user, null, pet.PetId, checkIn, checkOut);

        Check(notificationRepo.Created.Count == 1, "Exactly 1 notification for hotel booking.");
        Check(notificationRepo.Created[0].Type == NotificationType.BookingReceived, "Type must be BookingReceived.");
        Check(notificationRepo.Created[0].RecipientUserId == ownerUserId, "Recipient must be ownerUserId.");
        Check(notificationRepo.Created[0].AppointmentId == result.Appointment.AppointmentId, "AppointmentId must match.");
        Check(!notificationRepo.Created[0].InsideTransaction, "Notification must be sent outside transaction.");
    }),
    ("HotelBookingService.CreateHotelAppointmentAsync sends nothing when there is no capacity", async () =>
    {
        var ownerUserId = Guid.NewGuid();
        var pet = new Pet { PetId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };
        var checkIn = DateTimeOffset.UtcNow.AddDays(2);
        var checkOut = checkIn.AddDays(2);
        var held = new[]
        {
            new HeldHotelStay(checkIn, checkOut),
        };
        var repo = new TestHotelBookingRepo(1, held);
        var guard = new TestConcurrencyGuard();
        var notificationRepo = new TestNotificationRepo(() => guard.InsideRun);
        var reader = new TestAppointmentNotificationReader(_ => null);
        var notifier = new AppointmentNotifier(reader, new NotificationService(notificationRepo), new ShopTimeZone(TimeZoneInfo.Utc));

        var service = new HotelBookingService(
            new TestPetRepo(pet, ownerUserId),
            new TestStaffRoleReader(null),
            repo,
            new TestHotelCatalogRepo
            {
                Prices = [new HotelPricing { Species = Species.Dog, SizeGroup = SizeGroup.Small, PricePerNight = 100000m, FoodPerNight = 20000m }],
            },
            new ShopTimeZone(TimeZoneInfo.Utc),
            guard,
            notifier);

        var user = new CurrentUser(ownerUserId, UserRole.Customer);
        var code = await FailureCodeAsync(() => service.CreateHotelAppointmentAsync(user, null, pet.PetId, checkIn, checkOut));

        Check(code == ErrorCodes.NoCapacity, "Must fail with NO_CAPACITY.");
        Check(notificationRepo.Created.Count == 0 && reader.Requested.Count == 0,
            "No notification or reader request when booking fails.");
    }),
    ("AssignmentService.ConfirmSpaAsync notifies the customer and the assigned staff after the transaction", async () =>
    {
        var customerUserId = Guid.NewGuid();
        var staffUserId = Guid.NewGuid();
        var staffCandidate = new SpaStaffCandidate(staffUserId, "An");
        var appointment = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var bath = Guid.NewGuid();
        var shifts = new List<StaffShiftWindow>
        {
            new(staffUserId, appointment.SlotStart.AddHours(-1), appointment.SlotStart.AddHours(4))
        };

        var guard = new TestConcurrencyGuard();
        var notificationRepo = new TestNotificationRepo(() => guard.InsideRun);
        var reader = new TestAppointmentNotificationReader(id =>
            new AppointmentNotificationContext(appointment, customerUserId, [staffUserId]));
        var notifier = new AppointmentNotifier(reader, new NotificationService(notificationRepo), new ShopTimeZone(TimeZoneInfo.Utc));

        var repo = new TestAssignmentRepo(appointment, [staffCandidate], [], new Dictionary<Guid, int>())
        {
            AmountInput = new SpaAmountInput(
                Species.Dog,
                [bath],
                [new ServicePricing { ServiceId = bath, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 100_000m }]),
        };
        var scheduleRepo = new TestScheduleRepo(15, false, shifts, []);
        var service = new AssignmentService(repo, scheduleRepo, guard, notifier);

        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);
        var result = await service.ConfirmSpaAsync(manager, appointment.AppointmentId, [staffUserId]);

        Check(result.Status == AppointmentStatus.Confirmed, "Status must be Confirmed.");
        Check(notificationRepo.Created.Count == 2, "2 notifications (customer + staff).");
        Check(notificationRepo.Created.All(n => n.Type == NotificationType.ConfirmedAssigned), "Type must be ConfirmedAssigned.");
        Check(notificationRepo.Created.All(n => !n.InsideTransaction), "All notifications must be sent after transaction.");
        Check(notificationRepo.Created.All(n => n.AppointmentId == appointment.AppointmentId), "AppointmentId must match.");
    }),
    ("AssignmentService.ConfirmSpaAsync sends nothing when the confirmation fails", async () =>
    {
        var staffUserId = Guid.NewGuid();
        var staffCandidate = new SpaStaffCandidate(staffUserId, "An");
        var appointment = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var busy = new List<StaffBusyWindow>
        {
            new(staffUserId, appointment.SlotStart, appointment.BusyUntil)
        };

        var guard = new TestConcurrencyGuard();
        var notificationRepo = new TestNotificationRepo(() => guard.InsideRun);
        var reader = new TestAppointmentNotificationReader(_ => null);
        var notifier = new AppointmentNotifier(reader, new NotificationService(notificationRepo), new ShopTimeZone(TimeZoneInfo.Utc));

        var repo = new TestAssignmentRepo(appointment, [staffCandidate], busy, new Dictionary<Guid, int>());
        var scheduleRepo = new TestScheduleRepo(15, false, [], []);
        var service = new AssignmentService(repo, scheduleRepo, guard, notifier);

        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);
        var code = await FailureCodeAsync(() => service.ConfirmSpaAsync(manager, appointment.AppointmentId, [staffUserId]));

        Check(code == ErrorCodes.StaffConflict, "Must fail with STAFF_CONFLICT.");
        Check(notificationRepo.Created.Count == 0 && reader.Requested.Count == 0,
            "No notification or reader request when confirmation fails.");
    }),
    ("AssignmentService.RejectSpaAsync notifies the customer with the StoreUnable reason", async () =>
    {
        var customerUserId = Guid.NewGuid();
        var appointment = OldSpaAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var guard = new TestConcurrencyGuard();
        var notificationRepo = new TestNotificationRepo(() => guard.InsideRun);
        var reader = new TestAppointmentNotificationReader(id =>
            new AppointmentNotificationContext(appointment, customerUserId, []));
        var notifier = new AppointmentNotifier(reader, new NotificationService(notificationRepo), new ShopTimeZone(TimeZoneInfo.Utc));

        var repo = new TestAssignmentRepo(appointment, [], [], new Dictionary<Guid, int>());
        var scheduleRepo = new TestScheduleRepo(15, false, [], []);
        var service = new AssignmentService(repo, scheduleRepo, guard, notifier);

        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);
        await service.RejectSpaAsync(manager, appointment.AppointmentId);

        Check(notificationRepo.Created.Count == 1, "1 notification for customer.");
        Check(notificationRepo.Created[0].Type == NotificationType.Cancelled, "Type must be Cancelled.");
        Check(notificationRepo.Created[0].Message.Contains("Lý do: cửa hàng không thể đáp ứng."),
            "Message must contain StoreUnable reason text.");
        Check(!notificationRepo.Created[0].InsideTransaction, "Notification must be sent after transaction.");

        notificationRepo.Created.Clear();
        reader.Requested.Clear();
        var customer = new CurrentUser(Guid.NewGuid(), UserRole.Customer);
        var code = await FailureCodeAsync(() => service.RejectSpaAsync(customer, appointment.AppointmentId));
        Check(code == ErrorCodes.Forbidden, "Customer must be rejected with FORBIDDEN.");
        Check(notificationRepo.Created.Count == 0 && reader.Requested.Count == 0,
            "No notification on forbidden reject.");
    }),
    ("HotelAssignmentService.ConfirmHotelAsync notifies only the customer after the transaction", async () =>
    {
        var customerUserId = Guid.NewGuid();
        var appointment = OldHotelAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var cage = new Cage { CageId = Guid.NewGuid(), Code = "A1", Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };

        var guard = new TestConcurrencyGuard();
        var notificationRepo = new TestNotificationRepo(() => guard.InsideRun);
        var reader = new TestAppointmentNotificationReader(id =>
            new AppointmentNotificationContext(appointment, customerUserId, []));
        var notifier = new AppointmentNotifier(reader, new NotificationService(notificationRepo), new ShopTimeZone(TimeZoneInfo.Utc));

        var repo = new TestHotelAssignmentRepo(null, [cage], []) { Appointment = appointment };
        var service = new HotelAssignmentService(repo, new ShopTimeZone(TimeZoneInfo.Utc), guard, notifier);

        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);
        var status = await service.ConfirmHotelAsync(manager, appointment.AppointmentId, cage.CageId);

        Check(status == AppointmentStatus.Confirmed, "Status must be Confirmed.");
        Check(notificationRepo.Created.Count == 1, "Only 1 notification for customer.");
        Check(notificationRepo.Created[0].Type == NotificationType.ConfirmedAssigned, "Type must be ConfirmedAssigned.");
        Check(!notificationRepo.Created[0].InsideTransaction, "Notification must be sent after transaction.");

        notificationRepo.Created.Clear();
        reader.Requested.Clear();
        var busyWindows = new List<CageStayWindow>
        {
            new(cage.CageId, appointment.PlannedCheckIn, appointment.PlannedCheckOut)
        };
        var conflictAppointment = OldHotelAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var busyRepo = new TestHotelAssignmentRepo(null, [cage], busyWindows) { Appointment = conflictAppointment };
        var busyService = new HotelAssignmentService(busyRepo, new ShopTimeZone(TimeZoneInfo.Utc), guard, notifier);

        var code = await FailureCodeAsync(() => busyService.ConfirmHotelAsync(manager, conflictAppointment.AppointmentId, cage.CageId));
        Check(code == ErrorCodes.CageConflict, "Must fail with CAGE_CONFLICT.");
        Check(notificationRepo.Created.Count == 0 && reader.Requested.Count == 0,
            "No notification on CAGE_CONFLICT.");
    }),
    ("HotelAssignmentService.RejectHotelAsync notifies the customer with the StoreUnable reason", async () =>
    {
        var customerUserId = Guid.NewGuid();
        var appointment = OldHotelAppointment(AppointmentStatus.Pending, TimeSpan.FromDays(5));
        var guard = new TestConcurrencyGuard();
        var notificationRepo = new TestNotificationRepo(() => guard.InsideRun);
        var reader = new TestAppointmentNotificationReader(id =>
            new AppointmentNotificationContext(appointment, customerUserId, []));
        var notifier = new AppointmentNotifier(reader, new NotificationService(notificationRepo), new ShopTimeZone(TimeZoneInfo.Utc));

        var repo = new TestHotelAssignmentRepo(null, [], []) { Appointment = appointment };
        var service = new HotelAssignmentService(repo, new ShopTimeZone(TimeZoneInfo.Utc), guard, notifier);

        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);
        await service.RejectHotelAsync(manager, appointment.AppointmentId);

        Check(notificationRepo.Created.Count == 1, "1 notification for customer.");
        Check(notificationRepo.Created[0].Type == NotificationType.Cancelled, "Type must be Cancelled.");
        Check(notificationRepo.Created[0].Message.Contains("Lý do: cửa hàng không thể đáp ứng."),
            "Message must contain StoreUnable reason text.");
        Check(!notificationRepo.Created[0].InsideTransaction, "Notification must be sent after transaction.");

        notificationRepo.Created.Clear();
        reader.Requested.Clear();
        var customer = new CurrentUser(Guid.NewGuid(), UserRole.Customer);
        var code = await FailureCodeAsync(() => service.RejectHotelAsync(customer, appointment.AppointmentId));
        Check(code == ErrorCodes.Forbidden, "Customer must be rejected with FORBIDDEN.");
        Check(notificationRepo.Created.Count == 0 && reader.Requested.Count == 0,
            "No notification on forbidden reject.");
    }),
    ("AppointmentChangeService.CancelAsync notifies the customer and the assigned staff after the transaction", async () =>
    {
        var spa = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new ChangeFixture(spa);
        var staffUserId = Guid.NewGuid();
        fixture.StaffUserIds.Add(staffUserId);

        var status = await fixture.ChangeService.CancelAsync(fixture.Customer, spa.AppointmentId);

        Check(status == AppointmentStatus.Cancelled, "Status must be Cancelled.");
        Check(fixture.Notices.Created.Count == 2, "2 notifications for customer and staff.");
        Check(fixture.Notices.Created.All(n => n.Type == NotificationType.Cancelled), "Types must be Cancelled.");
        Check(fixture.Notices.Created.All(n => n.Message.Contains("Lý do: khách hàng chủ động hủy.")),
            "Messages must contain customer cancel reason.");
        Check(fixture.Notices.Created.All(n => !n.InsideTransaction), "Must be sent outside transaction.");
        Check(fixture.NotificationReader.Requested.Contains(spa.AppointmentId), "Reader must be called with appointment id.");

        var hotel = OldHotelAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var hotelFixture = new ChangeFixture(hotel);
        var hotelStatus = await hotelFixture.ChangeService.CancelAsync(hotelFixture.Customer, hotel.AppointmentId);
        Check(hotelStatus == AppointmentStatus.Cancelled, "Hotel status must be Cancelled.");
        Check(hotelFixture.Notices.Created.Count == 1, "Only 1 notification for hotel customer.");
        Check(hotelFixture.Notices.Created[0].RecipientUserId == hotelFixture.CustomerUserId, "Recipient must be customer.");
    }),
    ("AppointmentChangeService.CancelAsync sends nothing when the cancellation is refused", async () =>
    {
        var spa = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromMinutes(10));
        var fixture = new ChangeFixture(spa, deadlineMinutes: 60);
        var code = await FailureCodeAsync(() => fixture.ChangeService.CancelAsync(fixture.Customer, spa.AppointmentId));
        Check(code == ErrorCodes.ChangeWindowClosed, "Must fail with CHANGE_WINDOW_CLOSED.");
        Check(fixture.Notices.Created.Count == 0 && fixture.NotificationReader.Requested.Count == 0,
            "No notification on window closed.");

        var otherCustomer = new CurrentUser(Guid.NewGuid(), UserRole.Customer);
        var codeOther = await FailureCodeAsync(() => fixture.ChangeService.CancelAsync(otherCustomer, spa.AppointmentId));
        Check(codeOther == ErrorCodes.Forbidden, "Must fail with FORBIDDEN.");
        Check(fixture.Notices.Created.Count == 0 && fixture.NotificationReader.Requested.Count == 0,
            "No notification on wrong owner.");

        var completedSpa = OldSpaAppointment(AppointmentStatus.Completed, TimeSpan.FromDays(5));
        var completedFixture = new ChangeFixture(completedSpa);
        var codeCompleted = await FailureCodeAsync(() => completedFixture.ChangeService.CancelAsync(completedFixture.Customer, completedSpa.AppointmentId));
        Check(codeCompleted == ErrorCodes.InvalidTransition, "Must fail with INVALID_TRANSITION.");
        Check(completedFixture.Notices.Created.Count == 0 && completedFixture.NotificationReader.Requested.Count == 0,
            "No notification on completed.");
    }),
    ("AppointmentChangeService.ChangeAsync does not notify", async () =>
    {
        var appointment = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new ChangeFixture(appointment);

        var status = await fixture.ChangeService.ChangeAsync(fixture.Customer, appointment.AppointmentId, fixture.SpaChange);

        Check(status == AppointmentStatus.Pending, "Status must be Pending.");
        Check(fixture.Notices.Created.Count == 0 && fixture.NotificationReader.Requested.Count == 0,
            "ChangeAsync must not notify.");
    }),
    ("AppointmentInterventionService.CancelAsync notifies the customer and the staff in charge with the manager reason", async () =>
    {
        var spa = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(spa);
        var staffUserId = Guid.NewGuid();
        fixture.StaffUserIds.Add(staffUserId);

        var status = await fixture.Intervention.CancelAsync(fixture.Manager, spa.AppointmentId, CancelReason.StoreUnable);

        Check(status == AppointmentStatus.Cancelled, "Status must be Cancelled.");
        Check(fixture.Notices.Created.Count == 2, "2 notifications for customer and staff.");
        Check(fixture.Notices.Created.All(n => n.Type == NotificationType.Cancelled), "Types must be Cancelled.");
        Check(fixture.Notices.Created.All(n => n.Message.Contains("Lý do: cửa hàng không thể đáp ứng.")),
            "Messages must contain StoreUnable reason.");
        Check(fixture.Notices.Created.All(n => !n.InsideTransaction), "Must be sent outside transaction.");
        Check(fixture.NotificationReader.Requested.Contains(spa.AppointmentId), "Reader must be called with appointment id.");

        var hotel = OldHotelAppointment(AppointmentStatus.InStay, TimeSpan.FromDays(5));
        var hotelFixture = new InterventionFixture(hotel);
        var hotelStatus = await hotelFixture.Intervention.CancelAsync(hotelFixture.Manager, hotel.AppointmentId, CancelReason.CustomerBeyondDeadline);
        Check(hotelStatus == AppointmentStatus.Cancelled, "Hotel status must be Cancelled.");
        Check(hotelFixture.Notices.Created.Count == 1, "Only 1 notification for hotel customer.");
        Check(hotelFixture.Notices.Created[0].RecipientUserId == hotelFixture.CustomerUserId, "Recipient must be customer.");
        Check(hotelFixture.Notices.Created[0].Message.Contains("theo yêu cầu của khách hàng ngoài thời hạn tự phục vụ"),
            "Message must contain CustomerBeyondDeadline reason.");
        Check(!hotelFixture.Notices.Created[0].InsideTransaction, "Must be sent outside transaction.");
    }),
    ("AppointmentInterventionService.CancelAsync sends nothing when it is refused", async () =>
    {
        var spa = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(spa);

        var customer = new CurrentUser(Guid.NewGuid(), UserRole.Customer);
        var code1 = await FailureCodeAsync(() => fixture.Intervention.CancelAsync(customer, spa.AppointmentId, CancelReason.StoreUnable));
        Check(code1 == ErrorCodes.Forbidden, "Must fail with FORBIDDEN.");
        Check(fixture.Notices.Created.Count == 0 && fixture.NotificationReader.Requested.Count == 0,
            "No notification on non-manager.");

        var code2 = await FailureCodeAsync(() => fixture.Intervention.CancelAsync(fixture.Manager, spa.AppointmentId, CancelReason.CustomerCancelled));
        Check(code2 == ErrorCodes.ValidationError, "Must fail with VALIDATION_ERROR.");
        Check(fixture.Notices.Created.Count == 0 && fixture.NotificationReader.Requested.Count == 0,
            "No notification on invalid reason.");

        var completedSpa = OldSpaAppointment(AppointmentStatus.Completed, TimeSpan.FromDays(5));
        var completedFixture = new InterventionFixture(completedSpa);
        var code3 = await FailureCodeAsync(() => completedFixture.Intervention.CancelAsync(completedFixture.Manager, completedSpa.AppointmentId, CancelReason.StoreUnable));
        Check(code3 == ErrorCodes.InvalidTransition, "Must fail with INVALID_TRANSITION.");
        Check(completedFixture.Notices.Created.Count == 0 && completedFixture.NotificationReader.Requested.Count == 0,
            "No notification on completed.");

        var changingSpa = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var lockFixture = new InterventionFixture(changingSpa, beforeFindForUpdate: a => a.Status = AppointmentStatus.Completed);
        var code4 = await FailureCodeAsync(() => lockFixture.Intervention.CancelAsync(lockFixture.Manager, changingSpa.AppointmentId, CancelReason.StoreUnable));
        Check(code4 == ErrorCodes.InvalidTransition, "Must fail with INVALID_TRANSITION after lock.");
        Check(lockFixture.Notices.Created.Count == 0 && lockFixture.NotificationReader.Requested.Count == 0,
            "No notification on status changed after lock.");
    }),
    ("AppointmentInterventionService.RescheduleAsync does not notify", async () =>
    {
        var spa = OldSpaAppointment(AppointmentStatus.Confirmed, TimeSpan.FromDays(5));
        var fixture = new InterventionFixture(spa);

        var status = await fixture.Intervention.RescheduleAsync(fixture.Manager, spa.AppointmentId, fixture.SpaChange([fixture.Staff.StaffId]));

        Check(status == AppointmentStatus.Confirmed, "Status must be Confirmed.");
        Check(fixture.Notices.Created.Count == 0 && fixture.NotificationReader.Requested.Count == 0,
            "RescheduleAsync must not notify.");
    }),
    ("SupabasePhotoStorage rejects missing or invalid configuration", () =>
    {
        var invalid = new[]
        {
            new StorageOptions(),
            new StorageOptions { Url = "https://proj.supabase.co", ServiceKey = "svc-key" },
            new StorageOptions { Url = "https://proj.supabase.co", Bucket = "appointment-photos" },
            new StorageOptions { ServiceKey = "svc-key", Bucket = "appointment-photos" },
            new StorageOptions { Url = "not-a-url", ServiceKey = "svc-key", Bucket = "appointment-photos" },
        };

        foreach (var options in invalid)
        {
            AssertThrows<InvalidOperationException>(
                () => new SupabasePhotoStorage(new HttpClient(), options),
                "The adapter must refuse to start without a complete, valid Storage configuration.");
        }

        return Task.CompletedTask;
    }),
    ("SupabasePhotoStorage.UploadAsync posts the raw bytes to the private bucket with the service key", async () =>
    {
        var handler = new RecordingHttpHandler(_ => new HttpResponseMessage(System.Net.HttpStatusCode.OK));
        var storage = StorageTestKit.Create(handler);
        var bytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3 };

        await storage.UploadAsync("appointments/a1/before-p1.jpg", new MemoryStream(bytes), "image/jpeg");

        var request = handler.Requests.Single();
        Check(request.Method == HttpMethod.Post, "Upload must be a POST.");
        Check(request.Uri.ToString() == "https://proj.supabase.co/storage/v1/object/appointment-photos/appointments/a1/before-p1.jpg",
            $"Unexpected upload URL: {request.Uri}");
        Check(request.ApiKey == "svc-key" && request.Authorization == "Bearer svc-key",
            "Upload must send the service key in both apikey and Authorization headers.");
        Check(request.ContentType == "image/jpeg" && request.Body!.SequenceEqual(bytes),
            "Upload must send the raw bytes with the given content type.");
    }),
    ("SupabasePhotoStorage.CreateTemporaryUrlsAsync signs all keys in one call and keeps the input order for both signedURL forms", async () =>
    {
        var handler = new RecordingHttpHandler(_ => StorageTestKit.Json(
            "[{\"error\":null,\"path\":\"k2\",\"signedURL\":\"/object/sign/appointment-photos/k2?token=abc\"},"
            + "{\"error\":null,\"path\":\"k1\",\"signedURL\":\"/storage/v1/object/sign/appointment-photos/k1?token=def\"}]"));
        var storage = StorageTestKit.Create(handler);

        var urls = await storage.CreateTemporaryUrlsAsync(["k1", "k2"], TimeSpan.FromMinutes(60));

        var request = handler.Requests.Single();
        Check(request.Method == HttpMethod.Post
              && request.Uri.ToString() == "https://proj.supabase.co/storage/v1/object/sign/appointment-photos",
            $"Unexpected sign request: {request.Method} {request.Uri}");

        using var body = JsonDocument.Parse(request.Body!);
        Check(body.RootElement.GetProperty("expiresIn").GetInt32() == 3600, "expiresIn must be the lifetime in seconds.");
        Check(body.RootElement.GetProperty("paths").EnumerateArray().Select(e => e.GetString()).SequenceEqual(new[] { "k1", "k2" }),
            "paths must list the keys in order.");

        Check(urls.Count == 2
              && urls[0] == "https://proj.supabase.co/storage/v1/object/sign/appointment-photos/k1?token=def"
              && urls[1] == "https://proj.supabase.co/storage/v1/object/sign/appointment-photos/k2?token=abc",
            "URLs must follow the input order and be absolute for both relative forms.");
    }),
    ("SupabasePhotoStorage.CreateTemporaryUrlsAsync fails when a key is missing, has an error, or the URL form is unknown; empty input makes no call", async () =>
    {
        var missing = new RecordingHttpHandler(_ => StorageTestKit.Json(
            "[{\"error\":null,\"path\":\"k1\",\"signedURL\":\"/object/sign/appointment-photos/k1?token=a\"}]"));
        Check(await StorageTestKit.ThrowsInvalidOperationAsync(
                () => StorageTestKit.Create(missing).CreateTemporaryUrlsAsync(["k1", "k2"], TimeSpan.FromMinutes(1))),
            "A key without a signed URL must fail.");

        var withError = new RecordingHttpHandler(_ => StorageTestKit.Json(
            "[{\"error\":\"Object not found\",\"path\":\"k1\",\"signedURL\":null}]"));
        Check(await StorageTestKit.ThrowsInvalidOperationAsync(
                () => StorageTestKit.Create(withError).CreateTemporaryUrlsAsync(["k1"], TimeSpan.FromMinutes(1))),
            "A per-key error must fail.");

        var unknownForm = new RecordingHttpHandler(_ => StorageTestKit.Json(
            "[{\"error\":null,\"path\":\"k1\",\"signedURL\":\"object/sign/appointment-photos/k1?token=a\"}]"));
        Check(await StorageTestKit.ThrowsInvalidOperationAsync(
                () => StorageTestKit.Create(unknownForm).CreateTemporaryUrlsAsync(["k1"], TimeSpan.FromMinutes(1))),
            "An unrecognised signed URL form must fail.");

        var none = new RecordingHttpHandler(_ => new HttpResponseMessage(System.Net.HttpStatusCode.OK));
        var empty = await StorageTestKit.Create(none).CreateTemporaryUrlsAsync([], TimeSpan.FromMinutes(1));
        Check(empty.Count == 0 && none.Requests.Count == 0, "Empty input must return an empty list without any HTTP call.");
    }),
    ("SupabasePhotoStorage.DeleteAsync sends DELETE and non-success responses become a bounded InvalidOperationException", async () =>
    {
        var handler = new RecordingHttpHandler(_ => new HttpResponseMessage(System.Net.HttpStatusCode.OK));
        await StorageTestKit.Create(handler).DeleteAsync("appointments/a1/after-p2.png");

        var request = handler.Requests.Single();
        Check(request.Method == HttpMethod.Delete
              && request.Uri.ToString() == "https://proj.supabase.co/storage/v1/object/appointment-photos/appointments/a1/after-p2.png",
            $"Unexpected delete request: {request.Method} {request.Uri}");

        var failing = new RecordingHttpHandler(_ => new HttpResponseMessage(System.Net.HttpStatusCode.InternalServerError)
        {
            Content = new StringContent(new string('x', 1000)),
        });

        try
        {
            await StorageTestKit.Create(failing).DeleteAsync("k");
            throw new InvalidOperationException("The failing response did not raise an error.");
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("500"))
        {
            Check(!ex.Message.Contains(new string('x', 301)), "The error message must truncate the response body to 300 characters.");
            Check(!ex.Message.Contains("svc-key"), "The error message must never contain the service key.");
        }
    }),
    ("AddInfrastructure registers the Supabase photo storage from Storage__* configuration", () =>
    {
        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:Default"] = "Host=localhost;Database=petspa;Username=test;Password=test",
            ["Jwt:SigningKey"] = "this-is-a-valid-32-byte-secret-key-12345",
            ["Jwt:AccessTokenMinutes"] = "15",
            ["Jwt:RefreshTokenDays"] = "7",
            ["Storage:Url"] = "https://proj.supabase.co",
            ["Storage:ServiceKey"] = "svc-key",
            ["Storage:Bucket"] = "appointment-photos",
        };

        var services = new ServiceCollection();
        PetSpa.Infrastructure.DependencyInjection.AddInfrastructure(
            services, new ConfigurationBuilder().AddInMemoryCollection(settings).Build());
        using var provider = services.BuildServiceProvider();

        Check(provider.GetRequiredService<IPhotoStorage>() is SupabasePhotoStorage,
            "IPhotoStorage must resolve to the Supabase adapter.");
        return Task.CompletedTask;
    }),
    ("PhotoRules.Detect recognises JPEG, PNG and WebP by signature and rejects everything else", () =>
    {
        Check(PhotoRules.Detect(PhotoFixture.JpegBytes) is { ContentType: "image/jpeg", Extension: "jpg" }, "JPEG must be recognised.");
        Check(PhotoRules.Detect(PhotoFixture.PngBytes) is { ContentType: "image/png", Extension: "png" }, "PNG must be recognised.");
        Check(PhotoRules.Detect(PhotoFixture.WebpBytes) is { ContentType: "image/webp", Extension: "webp" }, "WebP must be recognised.");

        Check(PhotoRules.Detect(PhotoFixture.GifBytes) is null, "GIF must be rejected.");
        Check(PhotoRules.Detect(Encoding.ASCII.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\"/>")) is null, "SVG must be rejected.");
        Check(PhotoRules.Detect(Encoding.ASCII.GetBytes("<html><body></body></html>")) is null, "HTML must be rejected.");
        Check(PhotoRules.Detect(Encoding.ASCII.GetBytes("RIFF\0\0\0\0WAVEfmt ")) is null, "A RIFF file that is not WebP must be rejected.");
        Check(PhotoRules.Detect(new byte[] { 0xFF, 0xD8 }) is null, "A truncated JPEG signature must be rejected.");
        Check(PhotoRules.Detect(ReadOnlySpan<byte>.Empty) is null, "An empty header must be rejected.");

        return Task.CompletedTask;
    }),
    ("AppointmentPhotoService.UploadAsync stores a photo bound to the appointment, kind and uploader inside the locked transaction", async () =>
    {
        var cases = new (PhotoKind Kind, AppointmentStatus Status, byte[] Bytes, string ContentType, string Extension)[]
        {
            (PhotoKind.Before, AppointmentStatus.Received, PhotoFixture.JpegBytes, "image/jpeg", "jpg"),
            (PhotoKind.After, AppointmentStatus.InProgress, PhotoFixture.PngBytes, "image/png", "png"),
            (PhotoKind.Before, AppointmentStatus.Received, PhotoFixture.WebpBytes, "image/webp", "webp"),
        };

        foreach (var c in cases)
        {
            var f = new PhotoFixture(c.Status);
            var before = DateTimeOffset.UtcNow;

            var photoId = await f.CreateService().UploadAsync(
                f.SpaStaffUser, f.Spa.AppointmentId, c.Kind, new MemoryStream(c.Bytes));

            var photo = f.Photos.Added.Single();
            var expectedKey = $"appointments/{f.Spa.AppointmentId}/{c.Kind.ToString().ToLowerInvariant()}-{photoId}.{c.Extension}";
            Check(photo.PhotoId == photoId && photo.AppointmentId == f.Spa.AppointmentId && photo.Kind == c.Kind,
                "The row must carry the new id, the appointment and the kind.");
            Check(photo.UploadedByStaffId == f.SpaStaffId, "The row must carry the uploading staff id.");
            Check(photo.StorageKey == expectedKey, $"Unexpected storage key: {photo.StorageKey}");
            Check(photo.UploadedAt >= before && photo.UploadedAt <= DateTimeOffset.UtcNow, "UploadedAt must be the current time.");

            var upload = f.Storage.Uploads.Single();
            Check(upload.Key == expectedKey && upload.ContentType == c.ContentType,
                "The stored object must use the same key and the content type detected from the bytes.");
            Check(upload.Bytes.SequenceEqual(c.Bytes), "The complete file, including the signature bytes, must be uploaded.");

            Check(f.Guard.RunCalls == 1 && f.Guard.LockedAppointmentId == f.Spa.AppointmentId,
                "The row must be written inside one transaction that locks the appointment.");
            Check(f.Photos.InsideRunAtAdd == true, "The row must be added inside the transaction.");
            Check(f.Storage.Deleted.Count == 0, "A successful upload must not delete anything.");
        }
    }),
    ("AppointmentPhotoService.UploadAsync rejects out-of-scope, wrong-status and non-image uploads without touching storage or the database", async () =>
    {
        var cases = new (string Name, Action<PhotoFixture> Arrange, CurrentUser? User, PhotoKind Kind, byte[] Bytes, string Expected)[]
        {
            ("customer", _ => { }, new CurrentUser(Guid.NewGuid(), UserRole.Customer), PhotoKind.Before, PhotoFixture.JpegBytes, ErrorCodes.Forbidden),
            ("manager", _ => { }, new CurrentUser(Guid.NewGuid(), UserRole.Manager), PhotoKind.Before, PhotoFixture.JpegBytes, ErrorCodes.Forbidden),
            ("staff without a spa staff profile", f => f.Photos.SpaStaffId = null, null, PhotoKind.Before, PhotoFixture.JpegBytes, ErrorCodes.Forbidden),
            ("appointment not found", f => f.Appointments.DetailResult = null, null, PhotoKind.Before, PhotoFixture.JpegBytes, ErrorCodes.NotFound),
            ("not assigned to this staff", f => f.Appointments.AssignedResult = false, null, PhotoKind.Before, PhotoFixture.JpegBytes, ErrorCodes.Forbidden),
            ("hotel appointment", f => f.Appointments.DetailResult = new AppointmentDetailData(
                new HotelAppointment { AppointmentId = f.Spa.AppointmentId, Status = AppointmentStatus.Received }, f.OwnerUserId, "Milo", [], []),
                null, PhotoKind.Before, PhotoFixture.JpegBytes, ErrorCodes.Forbidden),
            ("before photo while confirmed", f => f.Spa.Status = AppointmentStatus.Confirmed, null, PhotoKind.Before, PhotoFixture.JpegBytes, ErrorCodes.InvalidTransition),
            ("before photo while in progress", f => f.Spa.Status = AppointmentStatus.InProgress, null, PhotoKind.Before, PhotoFixture.JpegBytes, ErrorCodes.InvalidTransition),
            ("before photo while completed", f => f.Spa.Status = AppointmentStatus.Completed, null, PhotoKind.Before, PhotoFixture.JpegBytes, ErrorCodes.InvalidTransition),
            ("after photo while received", _ => { }, null, PhotoKind.After, PhotoFixture.JpegBytes, ErrorCodes.InvalidTransition),
            ("after photo while completed", f => f.Spa.Status = AppointmentStatus.Completed, null, PhotoKind.After, PhotoFixture.JpegBytes, ErrorCodes.InvalidTransition),
            ("GIF file", _ => { }, null, PhotoKind.Before, PhotoFixture.GifBytes, ErrorCodes.ValidationError),
            ("empty file", _ => { }, null, PhotoKind.Before, Array.Empty<byte>(), ErrorCodes.ValidationError),
        };

        foreach (var c in cases)
        {
            var f = new PhotoFixture(AppointmentStatus.Received);
            c.Arrange(f);

            var code = await FailureCodeAsync(() => f.CreateService().UploadAsync(
                c.User ?? f.SpaStaffUser, f.Spa.AppointmentId, c.Kind, new MemoryStream(c.Bytes)));

            Check(code == c.Expected, $"{c.Name}: expected {c.Expected} but got {code ?? "no error"}.");
            Check(f.Storage.Uploads.Count == 0 && f.Photos.Added.Count == 0 && f.Guard.RunCalls == 0,
                $"{c.Name}: nothing may be uploaded, saved or locked.");
        }
    }),
    ("AppointmentPhotoService.UploadAsync deletes the uploaded file when the database write fails or the appointment changed meanwhile", async () =>
    {
        var failing = new PhotoFixture(AppointmentStatus.Received);
        failing.Photos.AddFailure = new InvalidOperationException("db down");
        failing.Storage.ThrowOnDelete = true;

        try
        {
            await failing.CreateService().UploadAsync(
                failing.SpaStaffUser, failing.Spa.AppointmentId, PhotoKind.Before, new MemoryStream(PhotoFixture.JpegBytes));
            throw new InvalidOperationException("The database failure must propagate.");
        }
        catch (InvalidOperationException ex)
        {
            Check(ex.Message == "db down", "The original error must be preserved.");
        }

        Check(failing.Storage.Deleted.SequenceEqual(new[] { failing.Storage.Uploads.Single().Key }),
            "The uploaded file must be deleted when the row cannot be saved.");

        var changed = new PhotoFixture(AppointmentStatus.Received);
        changed.Storage.OnUpload = () =>
        {
            changed.Spa.Status = AppointmentStatus.Completed;
            return Task.CompletedTask;
        };

        var code = await FailureCodeAsync(() => changed.CreateService().UploadAsync(
            changed.SpaStaffUser, changed.Spa.AppointmentId, PhotoKind.Before, new MemoryStream(PhotoFixture.JpegBytes)));

        Check(code == ErrorCodes.InvalidTransition, "The re-check after the lock must reject the changed appointment.");
        Check(changed.Photos.Added.Count == 0, "No row may be saved.");
        Check(changed.Storage.Deleted.SequenceEqual(new[] { changed.Storage.Uploads.Single().Key }),
            "The uploaded file must be deleted when the re-check fails.");
    }),
    ("UploadPhotoRequestValidator requires kind and a non-empty image file of at most 50 MB", () =>
    {
        var validator = new UploadPhotoRequestValidator();
        static FormFile MakeFile(long length) => new(Stream.Null, 0, length, "file", "photo.jpg");

        Check(validator.Validate(new UploadPhotoRequest { Kind = PhotoKind.Before, File = MakeFile(1) }).IsValid, "Before with a 1-byte file must be valid.");
        Check(validator.Validate(new UploadPhotoRequest { Kind = PhotoKind.After, File = MakeFile(PhotoRules.MaxFileBytes) }).IsValid, "Exactly 50 MB must be valid.");
        Check(!validator.Validate(new UploadPhotoRequest { Kind = PhotoKind.Before, File = MakeFile(PhotoRules.MaxFileBytes + 1) }).IsValid, "Over 50 MB must fail.");
        Check(!validator.Validate(new UploadPhotoRequest { Kind = PhotoKind.Before, File = MakeFile(0) }).IsValid, "An empty file must fail.");
        Check(!validator.Validate(new UploadPhotoRequest { Kind = null, File = MakeFile(1) }).IsValid, "A missing kind must fail.");
        Check(!validator.Validate(new UploadPhotoRequest { Kind = (PhotoKind)99, File = MakeFile(1) }).IsValid, "An undefined kind must fail.");
        Check(!validator.Validate(new UploadPhotoRequest { Kind = PhotoKind.Before, File = null }).IsValid, "A missing file must fail.");

        return Task.CompletedTask;
    }),
    ("AppointmentPhotosController.Upload is a POST {id}/photos for SpaStaff with the 50 MB request limits and rejects a missing request", async () =>
    {
        var method = typeof(AppointmentPhotosController).GetMethod(nameof(AppointmentPhotosController.Upload));
        var post = method?.GetCustomAttributes(typeof(HttpPostAttribute), true).OfType<HttpPostAttribute>().FirstOrDefault();
        var authorize = method?.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), true)
            .OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().FirstOrDefault();
        var sizeLimit = method?.GetCustomAttributes(typeof(RequestSizeLimitAttribute), true).Length;
        var formLimits = method?.GetCustomAttributes(typeof(RequestFormLimitsAttribute), true)
            .OfType<RequestFormLimitsAttribute>().FirstOrDefault();
        var route = typeof(AppointmentPhotosController).GetCustomAttributes(typeof(RouteAttribute), true)
            .OfType<RouteAttribute>().FirstOrDefault();

        Check(route?.Template == "api/v1/appointments", "The controller must be routed under api/v1/appointments.");
        Check(post?.Template == "{id}/photos", "Upload must be bound to POST {id}/photos.");
        Check(authorize?.Policy == AuthorizationPolicies.SpaStaff, "Upload must require the SpaStaff policy.");
        Check(sizeLimit == 1 && formLimits?.MultipartBodyLengthLimit == PhotoRules.MaxRequestBytes,
            "Upload must set the request size and multipart limits.");

        var controller = new AppointmentPhotosController(null!);
        Check(await FailureCodeAsync(() => controller.Upload(Guid.NewGuid(), null, CancellationToken.None)) == ErrorCodes.ValidationError,
            "A missing request must be rejected with VALIDATION_ERROR.");
    }),
    ("AppointmentPhotosController.Upload returns 201 with only the photo id", async () =>
    {
        var f = new PhotoFixture(AppointmentStatus.Received);
        var controller = new AppointmentPhotosController(f.CreateService())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, f.SpaStaffUser.UserId.ToString()),
                        new Claim(TokenClaims.Role, "Staff"),
                    ], "test")),
                },
            },
        };

        var file = new FormFile(new MemoryStream(PhotoFixture.JpegBytes), 0, PhotoFixture.JpegBytes.Length, "file", "photo.jpg");
        var result = await controller.Upload(
            f.Spa.AppointmentId, new UploadPhotoRequest { Kind = PhotoKind.Before, File = file }, CancellationToken.None) as ObjectResult;

        var saved = f.Photos.Added.Single();
        Check(result?.StatusCode == StatusCodes.Status201Created
              && result.Value is PhotoCreatedResponse { PhotoId: var photoId } && photoId == saved.PhotoId,
            "Upload must return 201 with the new photo id.");

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        Check(JsonSerializer.Serialize(result!.Value, options) == $"{{\"photoId\":\"{saved.PhotoId}\"}}",
            "The response body must contain only photoId.");
    }),
    ("AddApplication registers AppointmentPhotoService into DI container", () =>
    {
        var services = new ServiceCollection();
        services.AddApplication();
        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(AppointmentPhotoService));
        Check(descriptor is not null && descriptor.Lifetime == ServiceLifetime.Scoped,
            "AppointmentPhotoService must be registered as scoped in AddApplication.");
        return Task.CompletedTask;
    }),
    ("AddInfrastructure registers the appointment photo repository", () =>
    {
        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:Default"] = "Host=localhost;Database=petspa;Username=test;Password=test",
            ["Jwt:SigningKey"] = "this-is-a-valid-32-byte-secret-key-12345",
            ["Jwt:AccessTokenMinutes"] = "15",
            ["Jwt:RefreshTokenDays"] = "7",
        };

        var services = new ServiceCollection();
        PetSpa.Infrastructure.DependencyInjection.AddInfrastructure(
            services, new ConfigurationBuilder().AddInMemoryCollection(settings).Build());

        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IAppointmentPhotoRepository));
        Check(descriptor is not null
              && descriptor.Lifetime == ServiceLifetime.Scoped
              && descriptor.ImplementationType == typeof(PetSpa.Infrastructure.Persistence.Repositories.AppointmentPhotoRepository),
            "IAppointmentPhotoRepository must be registered as a scoped AppointmentPhotoRepository.");
        return Task.CompletedTask;
    }),
    ("AppointmentPhotoService.ListAsync returns photos only to the owner customer, the assigned spa staff and the manager", async () =>
    {
        var cases = new (string Name, Action<PhotoFixture> Arrange, Func<PhotoFixture, CurrentUser> User, StaffRole? Role, string? Expected)[]
        {
            ("owner customer", _ => { }, f => new CurrentUser(f.OwnerUserId, UserRole.Customer), null, null),
            ("another customer", _ => { }, _ => new CurrentUser(Guid.NewGuid(), UserRole.Customer), null, ErrorCodes.Forbidden),
            ("customer of a walk-in appointment", f => f.Appointments.DetailResult = new AppointmentDetailData(f.Spa, null, "Milo", [], []),
                _ => new CurrentUser(Guid.NewGuid(), UserRole.Customer), null, ErrorCodes.Forbidden),
            ("assigned spa staff", _ => { }, f => f.SpaStaffUser, StaffRole.SpaStaff, null),
            ("spa staff not assigned", f => f.Appointments.AssignedResult = false, f => f.SpaStaffUser, StaffRole.SpaStaff, ErrorCodes.Forbidden),
            ("receptionist", _ => { }, f => f.SpaStaffUser, StaffRole.Receptionist, ErrorCodes.Forbidden),
            ("staff without a profile", _ => { }, f => f.SpaStaffUser, null, ErrorCodes.Forbidden),
            ("manager", _ => { }, _ => new CurrentUser(Guid.NewGuid(), UserRole.Manager), null, null),
            ("appointment not found for a manager", f => f.Appointments.DetailResult = null,
                _ => new CurrentUser(Guid.NewGuid(), UserRole.Manager), null, ErrorCodes.NotFound),
            ("appointment not found for a customer", f => f.Appointments.DetailResult = null,
                _ => new CurrentUser(Guid.NewGuid(), UserRole.Customer), null, ErrorCodes.NotFound),
        };

        foreach (var c in cases)
        {
            var f = new PhotoFixture(AppointmentStatus.Completed);
            f.AddPhoto(PhotoKind.Before, DateTimeOffset.UtcNow.AddHours(-1));
            c.Arrange(f);

            IReadOnlyList<AppointmentPhotoView>? result = null;
            var code = await FailureCodeAsync(async () =>
                result = await f.CreateService(c.Role).ListAsync(c.User(f), f.Spa.AppointmentId));

            Check(code == c.Expected, $"{c.Name}: expected {c.Expected ?? "success"} but got {code ?? "success"}.");

            if (c.Expected is null)
                Check(result?.Count == 1, $"{c.Name}: the photo of the appointment must be returned.");
            else
                Check(result is null && f.Storage.UrlRequests.Count == 0, $"{c.Name}: no photo and no URL may be produced.");
        }
    }),
    ("AppointmentPhotoService.ListAsync returns only this appointment's photos in order, with temporary URLs and no storage key", async () =>
    {
        var f = new PhotoFixture(AppointmentStatus.Completed);
        var t0 = DateTimeOffset.UtcNow.AddHours(-2);
        var first = f.AddPhoto(PhotoKind.Before, t0);
        var second = f.AddPhoto(PhotoKind.After, t0.AddHours(1));
        f.AddPhoto(PhotoKind.Before, t0, Guid.NewGuid());

        var views = await f.CreateService(null).ListAsync(new CurrentUser(Guid.NewGuid(), UserRole.Manager), f.Spa.AppointmentId);

        Check(views.Select(v => v.PhotoId).SequenceEqual(new[] { first.PhotoId, second.PhotoId }),
            "Only this appointment's photos must be returned, in repository order.");
        Check(views[0].Kind == PhotoKind.Before && views[0].UploadedAt == t0
              && views[0].Url == $"https://files.test/{first.StorageKey}?token=t",
            "Each view must carry its own kind, time and temporary URL.");
        Check(views[1].Kind == PhotoKind.After && views[1].Url == $"https://files.test/{second.StorageKey}?token=t",
            "The second view must carry the URL of the second photo.");

        var request = f.Storage.UrlRequests.Single();
        Check(request.Lifetime == TimeSpan.FromMinutes(60), "URLs must be valid for 60 minutes.");
        Check(request.Keys.SequenceEqual(new[] { first.StorageKey, second.StorageKey }),
            "All keys must be signed in one call, in order.");

        Check(typeof(AppointmentPhotoView).GetProperty("StorageKey") is null && typeof(PhotoResponse).GetProperty("StorageKey") is null,
            "The storage key must never be part of the returned models.");
    }),
    ("AppointmentPhotoService.ListAsync returns an empty list without calling storage when there are no photos, including for a hotel appointment", async () =>
    {
        var spa = new PhotoFixture(AppointmentStatus.Received);
        var empty = await spa.CreateService().ListAsync(new CurrentUser(spa.OwnerUserId, UserRole.Customer), spa.Spa.AppointmentId);
        Check(empty.Count == 0 && spa.Storage.UrlRequests.Count == 0, "No photos must give an empty list and no storage call.");

        var hotel = new PhotoFixture(AppointmentStatus.InStay);
        hotel.Appointments.DetailResult = new AppointmentDetailData(
            new HotelAppointment { AppointmentId = hotel.Spa.AppointmentId, Status = AppointmentStatus.InStay }, hotel.OwnerUserId, "Milo", [], []);
        var hotelResult = await hotel.CreateService().ListAsync(new CurrentUser(hotel.OwnerUserId, UserRole.Customer), hotel.Spa.AppointmentId);
        Check(hotelResult.Count == 0 && hotel.Storage.UrlRequests.Count == 0, "A hotel appointment has no photos.");
    }),
    ("AppointmentPhotosController.List is a GET {id}/photos for customers, spa staff and managers and returns only the public fields", async () =>
    {
        var method = typeof(AppointmentPhotosController).GetMethod(nameof(AppointmentPhotosController.List));
        var get = method?.GetCustomAttributes(typeof(HttpGetAttribute), true).OfType<HttpGetAttribute>().FirstOrDefault();
        var authorize = method?.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), true)
            .OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().FirstOrDefault();

        Check(get?.Template == "{id}/photos", "List must be bound to GET {id}/photos.");
        Check(authorize?.Policy == AuthorizationPolicies.CustomerOrSpaStaffOrManager,
            "List must require the CustomerOrSpaStaffOrManager policy.");

        var f = new PhotoFixture(AppointmentStatus.Completed);
        var photo = f.AddPhoto(PhotoKind.After, DateTimeOffset.UtcNow);
        var controller = new AppointmentPhotosController(f.CreateService(null))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, Guid.NewGuid().ToString()),
                        new Claim(TokenClaims.Role, "Manager"),
                    ], "test")),
                },
            },
        };

        var ok = await controller.List(f.Spa.AppointmentId, CancellationToken.None) as OkObjectResult;
        Check(ok?.Value is List<PhotoResponse> { Count: 1 } list && list[0].PhotoId == photo.PhotoId,
            "List must return 200 with a plain array of photos.");

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        var json = JsonSerializer.Serialize(ok!.Value, options);
        Check(json.Contains("\"photoId\"") && json.Contains("\"kind\":\"After\"") && json.Contains("\"url\"") && json.Contains("\"uploadedAt\""),
            "The array items must expose photoId, kind, url and uploadedAt.");
        Check(!json.Contains("storageKey", StringComparison.OrdinalIgnoreCase),
            "The response must never contain the storage key.");
    }),
    ("AddApplication registers CostConfirmationService into DI container", () =>
    {
        var services = new ServiceCollection();
        services.AddApplication();
        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(CostConfirmationService));
        Check(descriptor is not null && descriptor.Lifetime == ServiceLifetime.Scoped,
            "CostConfirmationService must be registered as scoped in AddApplication.");
        return Task.CompletedTask;
    }),
    ("CostConfirmationRespondRequestValidator yêu cầu trường accept", () =>
    {
        var validator = new CostConfirmationRespondRequestValidator();
        Check(!validator.Validate(new CostConfirmationRespondRequest(null)).IsValid,
            "A missing accept must be invalid.");
        Check(validator.Validate(new CostConfirmationRespondRequest(true)).IsValid
            && validator.Validate(new CostConfirmationRespondRequest(false)).IsValid,
            "accept = true and accept = false must be valid.");
        return Task.CompletedTask;
    }),
    ("CostConfirmationService.RespondAsync: khách xác nhận chi phí mới lịch spa cập nhật nhóm kích cỡ của lịch và hồ sơ thú cưng, giữ nguyên Đã tiếp nhận và khung giờ", async () =>
    {
        var ownerId = Guid.NewGuid();
        var pet = WeightTestCat(2.8m, SizeGroup.Small);
        var spa = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Received, DateTimeOffset.UtcNow.AddMinutes(-5));
        var slotStart = spa.SlotStart;
        var slotEnd = spa.SlotEnd;
        var fixture = new CostConfirmationFixture(spa, pet, ownerId);

        var result = await fixture.Service.RespondAsync(new CurrentUser(ownerId, UserRole.Customer), spa.AppointmentId, true);

        Check(result.Status == AppointmentStatus.Received && spa.Status == AppointmentStatus.Received,
            "Accepting must keep the spa appointment Received.");
        Check(fixture.Confirmation.Status == ConfirmationStatus.Accepted
            && fixture.Confirmation.RespondedByUserId == ownerId && fixture.Confirmation.RespondedAt is not null,
            "The confirmation must be Accepted and record the responder.");
        Check(spa.SizeGroup == SizeGroup.Medium && spa.ActualWeightKg == 3.4m,
            "The appointment size group must follow the confirmed group.");
        Check(pet.WeightKg == 3.4m && pet.SizeGroup == SizeGroup.Medium,
            "The pet profile must follow the actual weight.");
        Check(spa.SlotStart == slotStart && spa.SlotEnd == slotEnd && spa.StaffRequired == 1,
            "The spa slot and staff count must not change (BR-23).");
        Check(fixture.Confirmations.SaveCalls == 1 && fixture.Changes.SavedCancellations.Count == 0,
            "Accepting must save once and must not cancel.");
        Check(fixture.Guard.RunCalls == 1 && fixture.Guard.LockedAppointmentId == spa.AppointmentId,
            "The response must run in one transaction holding the appointment lock.");
    }),
    ("CostConfirmationService.RespondAsync: khách từ chối chi phí mới hủy lịch spa với lý do CostNotConfirmed và không đổi hồ sơ thú cưng", async () =>
    {
        var ownerId = Guid.NewGuid();
        var pet = WeightTestCat(2.8m, SizeGroup.Small);
        var spa = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Received, DateTimeOffset.UtcNow.AddMinutes(-5));
        var fixture = new CostConfirmationFixture(spa, pet, ownerId);

        var result = await fixture.Service.RespondAsync(new CurrentUser(ownerId, UserRole.Customer), spa.AppointmentId, false);

        Check(result.Status == AppointmentStatus.Cancelled && spa.Status == AppointmentStatus.Cancelled
            && spa.CancelReason == CancelReason.CostNotConfirmed,
            "Rejecting must cancel the spa appointment with CostNotConfirmed.");
        Check(fixture.Confirmation.Status == ConfirmationStatus.Rejected && fixture.Confirmation.RespondedByUserId == ownerId,
            "The confirmation must be Rejected and record the responder.");
        Check(fixture.Changes.SavedCancellations.Single() == spa && fixture.Confirmations.SaveCalls == 0,
            "Rejecting must persist through SaveCancellationAsync.");
        Check(spa.SizeGroup == SizeGroup.Small && pet.WeightKg == 2.8m && pet.SizeGroup == SizeGroup.Small,
            "Rejecting must not change the appointment size group or the pet profile.");
    }),
    ("CostConfirmationService.RespondAsync: khách từ chối chi phí mới hủy lịch lưu trú Đã xác nhận với lý do CostNotConfirmed", async () =>
    {
        var ownerId = Guid.NewGuid();
        var pet = WeightTestCat(2.8m, SizeGroup.Small);
        var stay = WeightTestHotel(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed);
        var fixture = new CostConfirmationFixture(stay, pet, ownerId);

        var result = await fixture.Service.RespondAsync(new CurrentUser(ownerId, UserRole.Customer), stay.AppointmentId, false);

        Check(result.Status == AppointmentStatus.Cancelled && stay.CancelReason == CancelReason.CostNotConfirmed
            && fixture.Confirmation.Status == ConfirmationStatus.Rejected,
            "Rejecting must cancel the hotel appointment with CostNotConfirmed.");
        Check(pet.WeightKg == 2.8m && pet.SizeGroup == SizeGroup.Small, "The pet profile must not change.");
    }),
    ("CostConfirmationService.RespondAsync: chỉ chủ lịch (khách) hoặc lễ tân được phản hồi; khách khác, khách vãng lai, quản lý, nhân viên spa bị 403", async () =>
    {
        var ownerId = Guid.NewGuid();

        CostConfirmationFixture Create(Guid? owner, StaffRole? role = null)
        {
            var pet = WeightTestCat(2.8m, SizeGroup.Small);
            var spa = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Received, DateTimeOffset.UtcNow.AddMinutes(-5));
            return new CostConfirmationFixture(spa, pet, owner, role);
        }

        var other = Create(ownerId);
        var otherCode = await FailureCodeAsync(() => other.Service.RespondAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Customer), other.Appointment.AppointmentId, true));
        Check(otherCode == ErrorCodes.Forbidden && other.Confirmation.Status == ConfirmationStatus.Pending
            && other.Guard.RunCalls == 0,
            "Another customer must be rejected before any transaction and the confirmation must stay Pending.");

        var walkIn = Create(null);
        var walkInCode = await FailureCodeAsync(() => walkIn.Service.RespondAsync(
            new CurrentUser(ownerId, UserRole.Customer), walkIn.Appointment.AppointmentId, true));
        Check(walkInCode == ErrorCodes.Forbidden, "A customer must not respond for a walk-in appointment.");

        var manager = Create(ownerId);
        var managerCode = await FailureCodeAsync(() => manager.Service.RespondAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Manager), manager.Appointment.AppointmentId, true));
        Check(managerCode == ErrorCodes.Forbidden, "A manager must be rejected.");

        var spaStaff = Create(ownerId, StaffRole.SpaStaff);
        var spaStaffCode = await FailureCodeAsync(() => spaStaff.Service.RespondAsync(
            new CurrentUser(Guid.NewGuid(), UserRole.Staff), spaStaff.Appointment.AppointmentId, true));
        Check(spaStaffCode == ErrorCodes.Forbidden, "A spa staff member must be rejected.");

        var receptionistId = Guid.NewGuid();
        var receptionist = Create(null, StaffRole.Receptionist);
        var result = await receptionist.Service.RespondAsync(
            new CurrentUser(receptionistId, UserRole.Staff), receptionist.Appointment.AppointmentId, true);
        Check(result.Status == AppointmentStatus.Received
            && receptionist.Confirmation.Status == ConfirmationStatus.Accepted
            && receptionist.Confirmation.RespondedByUserId == receptionistId,
            "A receptionist must respond for a walk-in appointment and be recorded as the responder.");
    }),
    ("CostConfirmationService.RespondAsync: không tìm thấy lịch, không có yêu cầu Pending, quá hạn, lịch sai trạng thái và phản hồi lặp", async () =>
    {
        var ownerId = Guid.NewGuid();
        var user = new CurrentUser(ownerId, UserRole.Customer);

        CostConfirmationFixture Create(AppointmentStatus status = AppointmentStatus.Received, bool withPending = true, int expiresInMinutes = 20)
        {
            var pet = WeightTestCat(2.8m, SizeGroup.Small);
            var spa = WeightTestSpa(pet.PetId, SizeGroup.Small, status, DateTimeOffset.UtcNow.AddMinutes(-5));
            return new CostConfirmationFixture(spa, pet, ownerId, null, withPending, expiresInMinutes);
        }

        var missing = Create();
        Check(await FailureCodeAsync(() => missing.Service.RespondAsync(user, Guid.NewGuid(), true)) == ErrorCodes.NotFound,
            "A missing appointment must return NOT_FOUND.");

        var noPending = Create(withPending: false);
        Check(await FailureCodeAsync(() => noPending.Service.RespondAsync(user, noPending.Appointment.AppointmentId, true)) == ErrorCodes.NotFound,
            "An appointment without a Pending confirmation must return NOT_FOUND.");

        foreach (var accept in new[] { true, false })
        {
            var expired = Create(expiresInMinutes: -1);
            var expiredCode = await FailureCodeAsync(() => expired.Service.RespondAsync(user, expired.Appointment.AppointmentId, accept));
            Check(expiredCode == ErrorCodes.CostConfirmationExpired, "An expired confirmation must return COST_CONFIRMATION_EXPIRED.");
            Check(expired.Confirmation.Status == ConfirmationStatus.Pending && expired.Appointment.Status == AppointmentStatus.Received
                && expired.Pet.WeightKg == 2.8m && expired.Confirmations.SaveCalls == 0 && expired.Changes.SavedCancellations.Count == 0,
                "An expired response must change nothing.");

            var wrongStatus = Create(AppointmentStatus.Confirmed);
            var wrongStatusCode = await FailureCodeAsync(() => wrongStatus.Service.RespondAsync(user, wrongStatus.Appointment.AppointmentId, accept));
            Check(wrongStatusCode == ErrorCodes.InvalidTransition && wrongStatus.Confirmation.Status == ConfirmationStatus.Pending
                && wrongStatus.Pet.WeightKg == 2.8m,
                "A spa appointment that is not Received must return INVALID_TRANSITION and change nothing.");
        }

        var twice = Create();
        await twice.Service.RespondAsync(user, twice.Appointment.AppointmentId, true);
        Check(await FailureCodeAsync(() => twice.Service.RespondAsync(user, twice.Appointment.AppointmentId, false)) == ErrorCodes.NotFound,
            "A second response must return NOT_FOUND because no Pending confirmation is left.");
    }),
    ("AppointmentsController.RespondCostConfirmation trả CostConfirmationRespondResponse và từ chối thiếu accept", async () =>
    {
        var ownerId = Guid.NewGuid();
        var pet = WeightTestCat(2.8m, SizeGroup.Small);
        var spa = WeightTestSpa(pet.PetId, SizeGroup.Small, AppointmentStatus.Received, DateTimeOffset.UtcNow.AddMinutes(-5));
        var fixture = new CostConfirmationFixture(spa, pet, ownerId);
        var controller = new AppointmentsController(null!, costConfirmationService: fixture.Service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, ownerId.ToString()),
                        new Claim(TokenClaims.Role, "Customer"),
                    ], "test")),
                },
            },
        };

        var missingBody = await FailureCodeAsync(() => controller.RespondCostConfirmation(spa.AppointmentId, null, CancellationToken.None));
        var missingAccept = await FailureCodeAsync(() => controller.RespondCostConfirmation(
            spa.AppointmentId, new CostConfirmationRespondRequest(null), CancellationToken.None));
        Check(missingBody == ErrorCodes.ValidationError && missingAccept == ErrorCodes.ValidationError,
            "A missing body or accept must throw VALIDATION_ERROR.");

        var result = await controller.RespondCostConfirmation(
            spa.AppointmentId, new CostConfirmationRespondRequest(false), CancellationToken.None) as OkObjectResult;
        Check(result?.Value is CostConfirmationRespondResponse { Status: AppointmentStatus.Cancelled, CageSuitable: null },
            "The action must return Ok with the appointment status and no cageSuitable when rejecting.");
    }),
    ("CostConfirmationService.RespondAsync: lịch lưu trú chấp nhận chi phí mới kiểm tra lại chuồng đã gán theo trạng thái sử dụng, loài và nhóm kích cỡ mới", async () =>
    {
        var ownerId = Guid.NewGuid();

        Cage CatCage(SizeGroup group, bool active = true, Species species = Species.Cat) => new()
        {
            CageId = Guid.NewGuid(),
            Code = "A1",
            Species = species,
            SizeGroup = group,
            IsActive = active,
        };

        async Task<(CostConfirmationResult Result, HotelAppointment Stay)> RunAsync(Cage? cage)
        {
            var pet = WeightTestCat(2.8m, SizeGroup.Small);
            var stay = WeightTestHotel(pet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed);
            stay.CageId = cage?.CageId;
            var fixture = new CostConfirmationFixture(
                stay, pet, ownerId, cages: cage is null ? Array.Empty<Cage>() : new[] { cage });
            var result = await fixture.Service.RespondAsync(
                new CurrentUser(ownerId, UserRole.Customer), stay.AppointmentId, true);
            return (result, stay);
        }

        var oldGroupCage = CatCage(SizeGroup.Small);
        var stale = await RunAsync(oldGroupCage);
        Check(stale.Result.CageSuitable == false && stale.Result.Status == AppointmentStatus.Confirmed,
            "A cage of the old size group must be reported as not suitable and the status must stay Confirmed.");
        Check(stale.Stay.SizeGroup == SizeGroup.Medium && stale.Stay.CageId == oldGroupCage.CageId,
            "The stay size group must follow the confirmed group and the assigned cage must not change.");

        Check((await RunAsync(CatCage(SizeGroup.Medium))).Result.CageSuitable == true,
            "A cage of the new size group must be reported as suitable.");
        Check((await RunAsync(CatCage(SizeGroup.Medium, active: false))).Result.CageSuitable == false,
            "An inactive cage must be reported as not suitable.");
        Check((await RunAsync(CatCage(SizeGroup.Medium, species: Species.Dog))).Result.CageSuitable == false,
            "A cage of another species must be reported as not suitable.");
        Check((await RunAsync(null)).Result.CageSuitable == false,
            "A stay without an assigned cage must be reported as not suitable.");
    }),
    ("CostConfirmationService.RespondAsync: lịch spa và nhánh từ chối không có kết quả kiểm tra chuồng", async () =>
    {
        var ownerId = Guid.NewGuid();
        var user = new CurrentUser(ownerId, UserRole.Customer);

        var spaPet = WeightTestCat(2.8m, SizeGroup.Small);
        var spa = WeightTestSpa(spaPet.PetId, SizeGroup.Small, AppointmentStatus.Received, DateTimeOffset.UtcNow.AddMinutes(-5));
        var spaFixture = new CostConfirmationFixture(spa, spaPet, ownerId);
        Check((await spaFixture.Service.RespondAsync(user, spa.AppointmentId, true)).CageSuitable is null,
            "A spa appointment has no cage to check.");

        var stayPet = WeightTestCat(2.8m, SizeGroup.Small);
        var stay = WeightTestHotel(stayPet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed);
        var stayFixture = new CostConfirmationFixture(stay, stayPet, ownerId);
        Check((await stayFixture.Service.RespondAsync(user, stay.AppointmentId, false)).CageSuitable is null,
            "Rejecting must not check the cage.");
    }),
    ("AppointmentPhotoService.ListAsync keeps showing photos older than the validity window", async () =>
    {
        var f = new PhotoFixture(AppointmentStatus.Completed);
        f.AddPhoto(PhotoKind.Before, DateTimeOffset.UtcNow.AddDays(-30));
        f.AddPhoto(PhotoKind.After, DateTimeOffset.UtcNow.AddDays(-29));

        var owner = new CurrentUser(f.OwnerUserId, UserRole.Customer);
        var result = await f.CreateService().ListAsync(owner, f.Spa.AppointmentId);

        Check(result.Count == 2, "Photos older than Photo.ValidityDays must still be listed for the owner.");
    }),
    ("TestAppointmentPhotoRepo latest before photo is per pet and ignores after photos", async () =>
    {
        var f = new PhotoFixture(AppointmentStatus.Received);
        var older = DateTimeOffset.UtcNow.AddDays(-3);
        var newer = DateTimeOffset.UtcNow.AddHours(-1);
        f.AddPhoto(PhotoKind.Before, older);
        f.AddPhoto(PhotoKind.Before, newer, Guid.NewGuid(), f.Spa.PetId);
        f.AddPhoto(PhotoKind.After, DateTimeOffset.UtcNow);
        f.AddPhoto(PhotoKind.Before, DateTimeOffset.UtcNow, Guid.NewGuid(), Guid.NewGuid());

        Check(await f.Photos.FindLatestBeforePhotoUploadedAtByPetAsync(f.Spa.PetId) == newer,
            "The latest Before photo of the pet must win over older, After and other-pet photos.");
        Check(await f.Photos.HasPhotoAsync(f.Spa.AppointmentId, PhotoKind.After)
              && !await f.Photos.HasPhotoAsync(Guid.NewGuid(), PhotoKind.Before),
            "HasPhotoAsync must match appointment and kind.");
    }),
    ("AppointmentProgressService.StartAsync moves a received spa appointment to in progress for the assigned spa staff and the manager", async () =>
    {
        foreach (var asManager in new[] { false, true })
        {
            var f = new ProgressFixture(AppointmentStatus.Received);
            f.Base.AddPhoto(PhotoKind.Before, DateTimeOffset.UtcNow.AddHours(-1));
            if (asManager) f.Base.Appointments.AssignedResult = false;
            var user = asManager ? f.ManagerUser : f.Base.SpaStaffUser;

            var status = await f.CreateService().StartAsync(user, f.Spa.AppointmentId);

            Check(status == AppointmentStatus.InProgress && f.Spa.Status == AppointmentStatus.InProgress,
                $"asManager={asManager}: the appointment must be in progress.");
            Check(f.Base.Guard.RunCalls == 1 && f.Base.Guard.LockedAppointmentId == f.Spa.AppointmentId,
                $"asManager={asManager}: the write must run in one transaction after locking the appointment.");
            Check(f.Assignments.SaveCalls == 1, $"asManager={asManager}: the appointment must be saved once.");
        }
    }),
    ("AppointmentProgressService.StartAsync enforces the before photo validity window per pet", async () =>
    {
        var now = DateTimeOffset.UtcNow;
        var cases = new (string Name, Action<ProgressFixture> Arrange, bool Allowed)[]
        {
            ("no photo", _ => { }, false),
            ("only an after photo", f => f.Base.AddPhoto(PhotoKind.After, now.AddHours(-1)), false),
            ("before photo 8 days old", f => f.Base.AddPhoto(PhotoKind.Before, now.AddDays(-8)), false),
            ("before photo 6 days old", f => f.Base.AddPhoto(PhotoKind.Before, now.AddDays(-6)), true),
            ("newer photo wins over an expired one", f =>
            {
                f.Base.AddPhoto(PhotoKind.Before, now.AddDays(-20));
                f.Base.AddPhoto(PhotoKind.Before, now.AddHours(-2));
            }, true),
            ("recent photo of another pet", f => f.Base.AddPhoto(PhotoKind.Before, now.AddHours(-1), Guid.NewGuid(), Guid.NewGuid()), false),
            ("recent photo from an earlier appointment of the same pet", f => f.Base.AddPhoto(PhotoKind.Before, now.AddDays(-2), Guid.NewGuid(), f.Spa.PetId), true),
            ("10 days old with a 30 day window", f =>
            {
                f.Base.Photos.ValidityDays = 30;
                f.Base.AddPhoto(PhotoKind.Before, now.AddDays(-10));
            }, true),
            ("4 days old with a 3 day window", f =>
            {
                f.Base.Photos.ValidityDays = 3;
                f.Base.AddPhoto(PhotoKind.Before, now.AddDays(-4));
            }, false),
        };

        foreach (var c in cases)
        {
            var f = new ProgressFixture(AppointmentStatus.Received);
            c.Arrange(f);

            var code = await FailureCodeAsync(() => f.CreateService().StartAsync(f.Base.SpaStaffUser, f.Spa.AppointmentId));

            if (c.Allowed)
            {
                Check(code is null && f.Spa.Status == AppointmentStatus.InProgress, $"{c.Name}: start must succeed.");
            }
            else
            {
                Check(code == ErrorCodes.PhotoRequired, $"{c.Name}: expected PHOTO_REQUIRED but got {code ?? "success"}.");
                Check(f.Spa.Status == AppointmentStatus.Received && f.Assignments.SaveCalls == 0,
                    $"{c.Name}: a rejected start must not change or save the appointment.");
            }
        }
    }),
    ("AppointmentProgressService.StartAsync rejects a wrong status without saving", async () =>
    {
        foreach (var status in new[] { AppointmentStatus.Confirmed, AppointmentStatus.InProgress, AppointmentStatus.Completed })
        {
            var f = new ProgressFixture(status);
            f.Base.AddPhoto(PhotoKind.Before, DateTimeOffset.UtcNow.AddHours(-1));

            var code = await FailureCodeAsync(() => f.CreateService().StartAsync(f.Base.SpaStaffUser, f.Spa.AppointmentId));

            Check(code == ErrorCodes.InvalidTransition, $"{status}: expected INVALID_TRANSITION but got {code ?? "success"}.");
            Check(f.Spa.Status == status && f.Assignments.SaveCalls == 0, $"{status}: nothing may change.");
        }
    }),
    ("AppointmentProgressService.StartAsync rejects when cost confirmation is pending", async () =>
    {
        var f = new ProgressFixture(AppointmentStatus.Received);
        f.Base.AddPhoto(PhotoKind.Before, DateTimeOffset.UtcNow.AddHours(-1));
        f.CostConfirmations.Add(new CostConfirmation
        {
            ConfirmationId = Guid.NewGuid(),
            AppointmentId = f.Spa.AppointmentId,
            Status = ConfirmationStatus.Pending,
        });

        var code = await FailureCodeAsync(() => f.CreateService().StartAsync(f.Base.SpaStaffUser, f.Spa.AppointmentId));

        Check(code == ErrorCodes.CostConfirmationPending,
            $"Expected COST_CONFIRMATION_PENDING but got {code ?? "success"}.");
        Check(f.Spa.Status == AppointmentStatus.Received && f.Assignments.SaveCalls == 0,
            "A pending cost confirmation must not change or save the appointment.");
    }),
    ("AppointmentProgressService rejects callers outside the allowed scope before taking any lock or writing", async () =>
    {
        var cases = new (string Name, Action<ProgressFixture> Arrange, Func<ProgressFixture, CurrentUser> User, StaffRole? Role, string Expected)[]
        {
            ("customer", _ => { }, _ => new CurrentUser(Guid.NewGuid(), UserRole.Customer), null, ErrorCodes.Forbidden),
            ("receptionist", _ => { }, f => f.Base.SpaStaffUser, StaffRole.Receptionist, ErrorCodes.Forbidden),
            ("staff without a profile", _ => { }, f => f.Base.SpaStaffUser, null, ErrorCodes.Forbidden),
            ("spa staff not assigned", f => f.Base.Appointments.AssignedResult = false, f => f.Base.SpaStaffUser, StaffRole.SpaStaff, ErrorCodes.Forbidden),
            ("appointment not found", f => f.Base.Appointments.DetailResult = null, f => f.ManagerUser, null, ErrorCodes.NotFound),
            ("hotel appointment", f => f.Base.Appointments.DetailResult = new AppointmentDetailData(
                new HotelAppointment { AppointmentId = Guid.NewGuid() }, null, "Milo", [], []), f => f.ManagerUser, null, ErrorCodes.NotFound),
        };

        foreach (var c in cases)
        {
            foreach (var operation in new[] { "start", "service" })
            {
                var f = new ProgressFixture(AppointmentStatus.InProgress);
                f.Base.AddPhoto(PhotoKind.Before, DateTimeOffset.UtcNow.AddHours(-1));
                c.Arrange(f);
                var service = f.CreateService(c.Role);
                var user = c.User(f);

                var code = await FailureCodeAsync(async () =>
                {
                    if (operation == "start")
                        await service.StartAsync(user, f.Spa.AppointmentId);
                    else
                        await service.UpdateServiceAsync(user, f.Spa.AppointmentId, f.ServiceId, true, null);
                });

                Check(code == c.Expected, $"{c.Name}/{operation}: expected {c.Expected} but got {code ?? "success"}.");
                Check(f.Base.Guard.RunCalls == 0 && f.Assignments.SaveCalls == 0 && f.Progress.SaveCalls == 0,
                    $"{c.Name}/{operation}: no transaction and no write may happen.");
                Check(f.Spa.Status == AppointmentStatus.InProgress && !f.Line.IsDone, $"{c.Name}/{operation}: nothing may change.");
            }
        }
    }),
    ("AppointmentProgressService.UpdateServiceAsync marks, unmarks and annotates a service of an in-progress appointment", async () =>
    {
        foreach (var asManager in new[] { false, true })
        {
            var f = new ProgressFixture(AppointmentStatus.InProgress);
            if (asManager) f.Base.Appointments.AssignedResult = false;
            var user = asManager ? f.ManagerUser : f.Base.SpaStaffUser;
            var service = f.CreateService();
            var before = DateTimeOffset.UtcNow;

            await service.UpdateServiceAsync(user, f.Spa.AppointmentId, f.ServiceId, true, "  Đã tắm xong ");
            Check(f.Line.IsDone && f.Line.DoneAt >= before && f.Line.DoneAt <= DateTimeOffset.UtcNow && f.Line.Note == "Đã tắm xong",
                $"asManager={asManager}: the service must be done with a trimmed note.");
            Check(f.Base.Guard.LockedAppointmentId == f.Spa.AppointmentId && f.Progress.SaveCalls == 1,
                $"asManager={asManager}: the write must run after locking the appointment and save once.");

            await service.UpdateServiceAsync(user, f.Spa.AppointmentId, f.ServiceId, false, null);
            Check(!f.Line.IsDone && f.Line.DoneAt is null && f.Line.Note == "Đã tắm xong",
                $"asManager={asManager}: unmarking must clear DoneAt and keep the note.");
            Check(f.Spa.Status == AppointmentStatus.InProgress, $"asManager={asManager}: the appointment status must not change.");
        }
    }),
    ("AppointmentProgressService.UpdateServiceAsync rejects a wrong appointment status or an unknown service without writing", async () =>
    {
        foreach (var status in new[] { AppointmentStatus.Confirmed, AppointmentStatus.Received, AppointmentStatus.Completed })
        {
            var f = new ProgressFixture(status);

            var code = await FailureCodeAsync(() =>
                f.CreateService().UpdateServiceAsync(f.Base.SpaStaffUser, f.Spa.AppointmentId, f.ServiceId, true, null));

            Check(code == ErrorCodes.InvalidTransition, $"{status}: expected INVALID_TRANSITION but got {code ?? "success"}.");
            Check(!f.Line.IsDone && f.Progress.SaveCalls == 0, $"{status}: nothing may change.");
        }

        var unknown = new ProgressFixture(AppointmentStatus.InProgress);
        var unknownCode = await FailureCodeAsync(() =>
            unknown.CreateService().UpdateServiceAsync(unknown.Base.SpaStaffUser, unknown.Spa.AppointmentId, Guid.NewGuid(), true, null));
        Check(unknownCode == ErrorCodes.NotFound && unknown.Progress.SaveCalls == 0, "A service that is not in the appointment must be NOT_FOUND.");
    }),
    ("ServiceProgressRequestValidator requires isDone and limits the note to 1000 characters", () =>
    {
        var validator = new ServiceProgressRequestValidator();

        Check(validator.Validate(new ServiceProgressRequest(true, null)).IsValid, "isDone alone must be valid.");
        Check(validator.Validate(new ServiceProgressRequest(false, new string('a', 1000))).IsValid, "A 1000 character note must be valid.");
        Check(!validator.Validate(new ServiceProgressRequest(null, "x")).IsValid, "A missing isDone must fail.");
        Check(!validator.Validate(new ServiceProgressRequest(true, new string('a', 1001))).IsValid, "A 1001 character note must fail.");

        return Task.CompletedTask;
    }),
    ("AppointmentProgressController exposes POST start and PATCH services for SpaStaffOrManager and returns the documented responses", async () =>
    {
        var type = typeof(AppointmentProgressController);
        var route = type.GetCustomAttributes(typeof(RouteAttribute), true).OfType<RouteAttribute>().FirstOrDefault();
        Check(route?.Template == "api/v1/appointments", "The controller must be routed under api/v1/appointments.");

        var start = type.GetMethod(nameof(AppointmentProgressController.Start));
        var update = type.GetMethod(nameof(AppointmentProgressController.UpdateService));
        Check(start?.GetCustomAttributes(typeof(HttpPostAttribute), true).OfType<HttpPostAttribute>().FirstOrDefault()?.Template == "{id}/start",
            "Start must be bound to POST {id}/start.");
        Check(update?.GetCustomAttributes(typeof(HttpPatchAttribute), true).OfType<HttpPatchAttribute>().FirstOrDefault()?.Template == "{id}/services/{serviceId}",
            "UpdateService must be bound to PATCH {id}/services/{serviceId}.");
        foreach (var method in new[] { start, update })
        {
            var authorize = method?.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), true)
                .OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().FirstOrDefault();
            Check(authorize?.Policy == AuthorizationPolicies.SpaStaffOrManager, "Both actions must require the SpaStaffOrManager policy.");
        }

        var f = new ProgressFixture(AppointmentStatus.Received);
        f.Base.AddPhoto(PhotoKind.Before, DateTimeOffset.UtcNow.AddHours(-1));
        var controller = new AppointmentProgressController(f.CreateService())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, f.Base.SpaStaffUser.UserId.ToString()),
                        new Claim(TokenClaims.Role, "Staff"),
                    ], "test")),
                },
            },
        };

        var started = await controller.Start(f.Spa.AppointmentId, CancellationToken.None) as OkObjectResult;
        Check(started?.Value is AppointmentStatusResponse { Status: AppointmentStatus.InProgress }, "Start must return 200 with status InProgress.");

        var updated = await controller.UpdateService(f.Spa.AppointmentId, f.ServiceId, new ServiceProgressRequest(true, null), CancellationToken.None);
        Check(updated is OkResult, "UpdateService must return 200 without a body.");

        Check(await FailureCodeAsync(() => controller.UpdateService(f.Spa.AppointmentId, f.ServiceId, null, CancellationToken.None)) == ErrorCodes.ValidationError,
            "A missing body must be VALIDATION_ERROR.");
        Check(await FailureCodeAsync(() => controller.UpdateService(f.Spa.AppointmentId, f.ServiceId, new ServiceProgressRequest(null, null), CancellationToken.None)) == ErrorCodes.ValidationError,
            "A missing isDone must be VALIDATION_ERROR.");
    }),
    ("The SpaStaffOrManager policy admits only a spa staff member or a manager", async () =>
    {
        var cases = new (string Name, string? Role, StaffRole? Profile, bool Allowed)[]
        {
            ("manager", "Manager", null, true),
            ("spa staff", "Staff", StaffRole.SpaStaff, true),
            ("receptionist", "Staff", StaffRole.Receptionist, false),
            ("staff without a profile", "Staff", null, false),
            ("customer", "Customer", null, false),
            ("anonymous caller", null, null, false),
        };

        foreach (var c in cases)
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddSingleton<IStaffRoleReader>(new TestStaffRoleReader(c.Profile));
            services.AddPetSpaAuthorization();
            using var provider = services.BuildServiceProvider();
            using var scope = provider.CreateScope();
            var authorization = scope.ServiceProvider
                .GetRequiredService<Microsoft.AspNetCore.Authorization.IAuthorizationService>();

            var identity = c.Role is null
                ? new ClaimsIdentity()
                : new ClaimsIdentity(
                [
                    new Claim(TokenClaims.UserId, Guid.NewGuid().ToString()),
                    new Claim(TokenClaims.Role, c.Role),
                ], "test");

            var result = await Microsoft.AspNetCore.Authorization.AuthorizationServiceExtensions.AuthorizeAsync(
                authorization, new ClaimsPrincipal(identity), AuthorizationPolicies.SpaStaffOrManager);

            Check(result.Succeeded == c.Allowed,
                $"{c.Name}: the policy must {(c.Allowed ? "admit" : "refuse")} this caller.");
        }
    }),
    ("Progress endpoints answer a wrong role, a wrong scope or an unmet condition with the documented error and change nothing", async () =>
    {
        var rows = new List<(string Name, string Operation, AppointmentStatus Status, string Caller,
            Action<ProgressFixture>? Arrange, int HttpStatus, string Code, bool BeforeTransaction)>();

        void Add(string name, string operation, AppointmentStatus status, string caller,
            Action<ProgressFixture>? arrange, int httpStatus, string code, bool beforeTransaction = false) =>
            rows.Add((name, operation, status, caller, arrange, httpStatus, code, beforeTransaction));

        var operations = new[]
        {
            ("start", AppointmentStatus.Received),
            ("service", AppointmentStatus.InProgress),
        };
        foreach (var (operation, status) in operations)
        {
            Add($"{operation} by a customer", operation, status, "customer", null,
                403, ErrorCodes.Forbidden, true);
            Add($"{operation} by a receptionist", operation, status, "receptionist", null,
                403, ErrorCodes.Forbidden, true);
            Add($"{operation} by a staff member without a profile", operation, status, "noProfile", null,
                403, ErrorCodes.Forbidden, true);
            Add($"{operation} by a spa staff member who is not assigned", operation, status, "spaStaff",
                f => f.Base.Appointments.AssignedResult = false,
                403, ErrorCodes.Forbidden, true);
            Add($"{operation} of a missing appointment", operation, status, "manager",
                f => f.Base.Appointments.DetailResult = null,
                404, ErrorCodes.NotFound, true);
            Add($"{operation} of a hotel appointment", operation, status, "manager",
                f => f.Base.Appointments.DetailResult = new AppointmentDetailData(
                    new HotelAppointment { AppointmentId = Guid.NewGuid() }, null, "Milo", [], []),
                404, ErrorCodes.NotFound, true);
        }

        foreach (var status in new[] { AppointmentStatus.Confirmed, AppointmentStatus.InProgress, AppointmentStatus.Completed })
            Add($"start of a {status} appointment", "start", status, "spaStaff", null,
                409, ErrorCodes.InvalidTransition);
        foreach (var status in new[] { AppointmentStatus.Pending, AppointmentStatus.Cancelled })
            Add($"start of a {status} appointment by the manager", "start", status, "manager", null,
                409, ErrorCodes.InvalidTransition);
        Add("start without a before photo", "start", AppointmentStatus.Received, "spaStaff",
            f => f.Base.Photos.Existing.Clear(),
            409, ErrorCodes.PhotoRequired);
        Add("start with a before photo older than the validity window", "start", AppointmentStatus.Received, "spaStaff",
            f =>
            {
                f.Base.Photos.Existing.Clear();
                f.Base.AddPhoto(PhotoKind.Before, DateTimeOffset.UtcNow.AddDays(-8));
            },
            409, ErrorCodes.PhotoRequired);
        Add("start while a cost confirmation is pending", "start", AppointmentStatus.Received, "spaStaff",
            f => f.CostConfirmations.Add(new CostConfirmation
            {
                ConfirmationId = Guid.NewGuid(),
                AppointmentId = f.Spa.AppointmentId,
                Status = ConfirmationStatus.Pending,
            }),
            409, ErrorCodes.CostConfirmationPending);

        foreach (var status in new[] { AppointmentStatus.Confirmed, AppointmentStatus.Received, AppointmentStatus.Completed })
            Add($"service update of a {status} appointment", "service", status, "spaStaff", null,
                409, ErrorCodes.InvalidTransition);
        foreach (var status in new[] { AppointmentStatus.Pending, AppointmentStatus.Cancelled })
            Add($"service update of a {status} appointment by the manager", "service", status, "manager", null,
                409, ErrorCodes.InvalidTransition);
        Add("service that is not part of the appointment", "service-unknown", AppointmentStatus.InProgress, "spaStaff", null,
            404, ErrorCodes.NotFound);
        Add("service update without a body", "service-no-body", AppointmentStatus.InProgress, "spaStaff", null,
            400, ErrorCodes.ValidationError, true);
        Add("service update without isDone", "service-no-flag", AppointmentStatus.InProgress, "spaStaff", null,
            400, ErrorCodes.ValidationError, true);

        Check(rows.Count == 28, $"Expected 28 cases but built {rows.Count}.");

        foreach (var row in rows)
        {
            var f = new ProgressFixture(row.Status);
            f.Base.AddPhoto(PhotoKind.Before, DateTimeOffset.UtcNow.AddHours(-1));
            row.Arrange?.Invoke(f);

            var user = row.Caller switch
            {
                "manager" => f.ManagerUser,
                "customer" => new CurrentUser(Guid.NewGuid(), UserRole.Customer),
                _ => f.Base.SpaStaffUser,
            };
            StaffRole? role = row.Caller switch
            {
                "receptionist" => StaffRole.Receptionist,
                "noProfile" => null,
                _ => StaffRole.SpaStaff,
            };

            var controller = CreateProgressController(f, user, role);
            Func<Task> call = row.Operation switch
            {
                "start" => () => controller.Start(f.Spa.AppointmentId, CancellationToken.None),
                "service" => () => controller.UpdateService(
                    f.Spa.AppointmentId, f.ServiceId, new ServiceProgressRequest(true, "Đã tắm xong"), CancellationToken.None),
                "service-unknown" => () => controller.UpdateService(
                    f.Spa.AppointmentId, Guid.NewGuid(), new ServiceProgressRequest(true, null), CancellationToken.None),
                "service-no-body" => () => controller.UpdateService(
                    f.Spa.AppointmentId, f.ServiceId, null, CancellationToken.None),
                "service-no-flag" => () => controller.UpdateService(
                    f.Spa.AppointmentId, f.ServiceId, new ServiceProgressRequest(null, "Đã tắm xong"), CancellationToken.None),
                _ => throw new InvalidOperationException($"Unknown operation {row.Operation}."),
            };

            var response = await ProgressResponseAsync(call);

            Check(response.Status == row.HttpStatus && response.Code == row.Code,
                $"{row.Name}: expected {row.HttpStatus} {row.Code} but got {response.Status} {response.Code ?? "success"}.");
            Check(response.ContentType.StartsWith("application/problem+json"),
                $"{row.Name}: the error must use the problem+json envelope.");
            Check(f.Spa.Status == row.Status, $"{row.Name}: the appointment status must not change.");
            Check(!f.Line.IsDone && f.Line.DoneAt is null && f.Line.Note is null,
                $"{row.Name}: the service progress must not change.");
            Check(f.Assignments.SaveCalls == 0 && f.Progress.SaveCalls == 0,
                $"{row.Name}: nothing may be saved.");
            if (row.BeforeTransaction)
                Check(f.Base.Guard.RunCalls == 0,
                    $"{row.Name}: the request must be refused before any transaction is opened.");
        }

        var started = new ProgressFixture(AppointmentStatus.Received);
        started.Base.AddPhoto(PhotoKind.Before, DateTimeOffset.UtcNow.AddHours(-1));
        var startResponse = await ProgressResponseAsync(() =>
            CreateProgressController(started, started.Base.SpaStaffUser).Start(started.Spa.AppointmentId, CancellationToken.None));
        Check(startResponse.Status == 200 && started.Spa.Status == AppointmentStatus.InProgress,
            "A valid start by the assigned spa staff must still succeed.");

        var updated = new ProgressFixture(AppointmentStatus.InProgress);
        var updateResponse = await ProgressResponseAsync(() =>
            CreateProgressController(updated, updated.ManagerUser).UpdateService(
                updated.Spa.AppointmentId, updated.ServiceId, new ServiceProgressRequest(true, null), CancellationToken.None));
        Check(updateResponse.Status == 200 && updated.Line.IsDone,
            "A valid update by the manager must still succeed.");
    }),
    ("AppointmentProgressService.CompleteAsync completes an in-progress spa appointment, releases the staff holds and forms the unpaid spa payment for the assigned spa staff and the manager", async () =>
    {
        foreach (var asManager in new[] { false, true })
        {
            var f = new ProgressFixture(AppointmentStatus.InProgress);
            f.MakeReadyToComplete();
            if (asManager) f.Base.Appointments.AssignedResult = false;
            var user = asManager ? f.ManagerUser : f.Base.SpaStaffUser;

            var status = await f.CreateService().CompleteAsync(user, f.Spa.AppointmentId);

            Check(status == AppointmentStatus.Completed && f.Spa.Status == AppointmentStatus.Completed,
                $"asManager={asManager}: the appointment must be completed.");
            Check(f.Base.Guard.RunCalls == 1 && f.Base.Guard.LockedAppointmentId == f.Spa.AppointmentId,
                $"asManager={asManager}: the write must run in one transaction after locking the appointment.");
            Check(f.Assignments.SaveCalls == 1, $"asManager={asManager}: the appointment must be saved once.");
            Check(f.Assignments.Added.Count == 1 && f.Assignments.Added.All(a => !a.IsHolding),
                $"asManager={asManager}: the staff holds must be released.");

            var payment = f.Payments.AddedPayments.SingleOrDefault();
            Check(payment is not null
                  && payment.PaymentId != Guid.Empty
                  && payment.AppointmentId == f.Spa.AppointmentId
                  && payment.Kind == PaymentKind.Spa
                  && payment.Amount == 150000m
                  && payment.Status == PaymentStatus.Unpaid
                  && payment.Method is null
                  && payment.PaidAt is null
                  && payment.ConfirmedByUserId is null,
                $"asManager={asManager}: exactly one unpaid spa payment must be formed with the computed amount.");
        }
    }),
    ("AppointmentProgressService.CompleteAsync prices the payment from the current size group and every service of the appointment", async () =>
    {
        foreach (var (sizeGroup, expected) in new[] { (SizeGroup.Small, 100000m), (SizeGroup.Medium, 150000m) })
        {
            var f = new ProgressFixture(AppointmentStatus.InProgress);
            f.MakeReadyToComplete(sizeGroup);

            await f.CreateService().CompleteAsync(f.Base.SpaStaffUser, f.Spa.AppointmentId);

            Check(f.Payments.AddedPayments.Single().Amount == expected,
                $"{sizeGroup}: the payment amount must follow the size group of the appointment.");
        }

        var multi = new ProgressFixture(AppointmentStatus.InProgress);
        multi.MakeReadyToComplete();
        var secondServiceId = Guid.NewGuid();
        multi.Progress.Lines.Add(new PetSpa.Domain.Entities.AppointmentService
        {
            AppointmentId = multi.Spa.AppointmentId,
            ServiceId = secondServiceId,
            IsDone = true,
        });
        multi.Assignments.AmountInput = new SpaAmountInput(
            Species.Cat,
            [multi.ServiceId, secondServiceId],
            [
                new ServicePricing { ServiceId = multi.ServiceId, Species = Species.Cat, SizeGroup = SizeGroup.Medium, Price = 150000m },
                new ServicePricing { ServiceId = secondServiceId, Species = Species.Cat, SizeGroup = SizeGroup.Medium, Price = 50000m },
            ]);

        await multi.CreateService().CompleteAsync(multi.Base.SpaStaffUser, multi.Spa.AppointmentId);

        Check(multi.Payments.AddedPayments.Single().Amount == 200000m,
            "The payment amount must add up the price of every service of the appointment.");
    }),
    ("AppointmentProgressService.CompleteAsync refuses an unmet condition without changing the appointment, the staff holds or the payments", async () =>
    {
        var now = DateTimeOffset.UtcNow;
        var cases = new (string Name, Action<ProgressFixture> Arrange, string Expected)[]
        {
            ("a service is not done", f => { f.Line.IsDone = false; f.Line.DoneAt = null; }, ErrorCodes.ServicesIncomplete),
            ("one of two services is not done", f => f.Progress.Lines.Add(new PetSpa.Domain.Entities.AppointmentService
            {
                AppointmentId = f.Spa.AppointmentId,
                ServiceId = Guid.NewGuid(),
                IsDone = false,
            }), ErrorCodes.ServicesIncomplete),
            ("the appointment has no service line", f => f.Progress.Lines.Clear(), ErrorCodes.ServicesIncomplete),
            ("no after photo", f => f.Base.Photos.Existing.Clear(), ErrorCodes.PhotoRequired),
            ("only a before photo", f =>
            {
                f.Base.Photos.Existing.Clear();
                f.Base.AddPhoto(PhotoKind.Before, now.AddHours(-1));
            }, ErrorCodes.PhotoRequired),
            ("an after photo that belongs to another appointment", f =>
            {
                f.Base.Photos.Existing.Clear();
                f.Base.AddPhoto(PhotoKind.After, now.AddMinutes(-5), Guid.NewGuid(), Guid.NewGuid());
            }, ErrorCodes.PhotoRequired),
            ("a cost confirmation is pending", f => f.CostConfirmations.Add(new CostConfirmation
            {
                ConfirmationId = Guid.NewGuid(),
                AppointmentId = f.Spa.AppointmentId,
                Status = ConfirmationStatus.Pending,
            }), ErrorCodes.CostConfirmationPending),
            ("a pending cost confirmation wins over incomplete services", f =>
            {
                f.CostConfirmations.Add(new CostConfirmation
                {
                    ConfirmationId = Guid.NewGuid(),
                    AppointmentId = f.Spa.AppointmentId,
                    Status = ConfirmationStatus.Pending,
                });
                f.Line.IsDone = false;
            }, ErrorCodes.CostConfirmationPending),
            ("incomplete services win over a missing after photo", f =>
            {
                f.Line.IsDone = false;
                f.Base.Photos.Existing.Clear();
            }, ErrorCodes.ServicesIncomplete),
            ("a price is missing", f => f.Assignments.AmountInput = new SpaAmountInput(Species.Cat, [f.ServiceId], []), ErrorCodes.ValidationError),
            ("the amount input is missing", f => f.Assignments.AmountInput = null, ErrorCodes.NotFound),
        };

        foreach (var c in cases)
        {
            var f = new ProgressFixture(AppointmentStatus.InProgress);
            f.MakeReadyToComplete();
            c.Arrange(f);

            var code = await FailureCodeAsync(() => f.CreateService().CompleteAsync(f.Base.SpaStaffUser, f.Spa.AppointmentId));

            Check(code == c.Expected, $"{c.Name}: expected {c.Expected} but got {code ?? "success"}.");
            Check(f.Spa.Status == AppointmentStatus.InProgress, $"{c.Name}: the appointment status must not change.");
            Check(f.Assignments.SaveCalls == 0 && f.Payments.AddedPayments.Count == 0,
                $"{c.Name}: nothing may be saved and no payment may be formed.");
            Check(f.Assignments.Added.All(a => a.IsHolding), $"{c.Name}: the staff holds must stay.");
        }

        foreach (var status in new[]
        {
            AppointmentStatus.Pending, AppointmentStatus.Confirmed, AppointmentStatus.Received,
            AppointmentStatus.Completed, AppointmentStatus.Cancelled,
        })
        {
            var f = new ProgressFixture(status);
            f.MakeReadyToComplete();

            var code = await FailureCodeAsync(() => f.CreateService().CompleteAsync(f.Base.SpaStaffUser, f.Spa.AppointmentId));

            Check(code == ErrorCodes.InvalidTransition, $"{status}: expected INVALID_TRANSITION but got {code ?? "success"}.");
            Check(f.Spa.Status == status && f.Assignments.SaveCalls == 0 && f.Payments.AddedPayments.Count == 0
                  && f.Assignments.Added.All(a => a.IsHolding),
                $"{status}: nothing may change.");
        }
    }),
    ("AppointmentProgressService.CompleteAsync rejects callers outside the allowed scope before taking any lock or writing", async () =>
    {
        var cases = new (string Name, Action<ProgressFixture> Arrange, Func<ProgressFixture, CurrentUser> User, StaffRole? Role, string Expected)[]
        {
            ("customer", _ => { }, _ => new CurrentUser(Guid.NewGuid(), UserRole.Customer), null, ErrorCodes.Forbidden),
            ("receptionist", _ => { }, f => f.Base.SpaStaffUser, StaffRole.Receptionist, ErrorCodes.Forbidden),
            ("staff without a profile", _ => { }, f => f.Base.SpaStaffUser, null, ErrorCodes.Forbidden),
            ("spa staff not assigned", f => f.Base.Appointments.AssignedResult = false, f => f.Base.SpaStaffUser, StaffRole.SpaStaff, ErrorCodes.Forbidden),
            ("appointment not found", f => f.Base.Appointments.DetailResult = null, f => f.ManagerUser, null, ErrorCodes.NotFound),
            ("hotel appointment", f => f.Base.Appointments.DetailResult = new AppointmentDetailData(
                new HotelAppointment { AppointmentId = Guid.NewGuid() }, null, "Milo", [], []), f => f.ManagerUser, null, ErrorCodes.NotFound),
        };

        foreach (var c in cases)
        {
            var f = new ProgressFixture(AppointmentStatus.InProgress);
            f.MakeReadyToComplete();
            c.Arrange(f);

            var code = await FailureCodeAsync(() => f.CreateService(c.Role).CompleteAsync(c.User(f), f.Spa.AppointmentId));

            Check(code == c.Expected, $"{c.Name}: expected {c.Expected} but got {code ?? "success"}.");
            Check(f.Base.Guard.RunCalls == 0 && f.Assignments.SaveCalls == 0 && f.Payments.AddedPayments.Count == 0,
                $"{c.Name}: no transaction and no write may happen.");
            Check(f.Spa.Status == AppointmentStatus.InProgress && f.Assignments.Added.All(a => a.IsHolding),
                $"{c.Name}: nothing may change.");
        }
    }),
    ("AppointmentProgressController exposes POST complete for SpaStaffOrManager and returns the documented response", async () =>
    {
        var method = typeof(AppointmentProgressController).GetMethod(nameof(AppointmentProgressController.Complete));
        Check(method?.GetCustomAttributes(typeof(HttpPostAttribute), true).OfType<HttpPostAttribute>().FirstOrDefault()?.Template == "{id}/complete",
            "Complete must be bound to POST {id}/complete.");
        var authorize = method?.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), true)
            .OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().FirstOrDefault();
        Check(authorize?.Policy == AuthorizationPolicies.SpaStaffOrManager, "Complete must require the SpaStaffOrManager policy.");

        var f = new ProgressFixture(AppointmentStatus.InProgress);
        f.MakeReadyToComplete();
        var controller = CreateProgressController(f, f.Base.SpaStaffUser);

        var result = await controller.Complete(f.Spa.AppointmentId, CancellationToken.None) as OkObjectResult;

        Check(result?.Value is AppointmentStatusResponse { Status: AppointmentStatus.Completed },
            "Complete must return 200 with status Completed.");
        Check(f.Payments.AddedPayments.Count == 1 && f.Payments.AddedPayments[0].Kind == PaymentKind.Spa,
            "Completing must form the spa payment.");
    }),
    ("Complete endpoint answers a wrong role, a wrong scope or an unmet condition with the documented error and changes nothing", async () =>
    {
        var rows = new List<(string Name, AppointmentStatus Status, string Caller,
            Action<ProgressFixture>? Arrange, int HttpStatus, string Code, bool BeforeTransaction)>();

        void Add(string name, AppointmentStatus status, string caller,
            Action<ProgressFixture>? arrange, int httpStatus, string code, bool beforeTransaction = false) =>
            rows.Add((name, status, caller, arrange, httpStatus, code, beforeTransaction));

        Add("complete by a customer", AppointmentStatus.InProgress, "customer", null,
            403, ErrorCodes.Forbidden, true);
        Add("complete by a receptionist", AppointmentStatus.InProgress, "receptionist", null,
            403, ErrorCodes.Forbidden, true);
        Add("complete by a staff member without a profile", AppointmentStatus.InProgress, "noProfile", null,
            403, ErrorCodes.Forbidden, true);
        Add("complete by a spa staff member who is not assigned", AppointmentStatus.InProgress, "spaStaff",
            f => f.Base.Appointments.AssignedResult = false,
            403, ErrorCodes.Forbidden, true);
        Add("complete of a missing appointment", AppointmentStatus.InProgress, "manager",
            f => f.Base.Appointments.DetailResult = null,
            404, ErrorCodes.NotFound, true);
        Add("complete of a hotel appointment", AppointmentStatus.InProgress, "manager",
            f => f.Base.Appointments.DetailResult = new AppointmentDetailData(
                new HotelAppointment { AppointmentId = Guid.NewGuid() }, null, "Milo", [], []),
            404, ErrorCodes.NotFound, true);

        foreach (var status in new[] { AppointmentStatus.Confirmed, AppointmentStatus.Received, AppointmentStatus.Completed })
            Add($"complete of a {status} appointment", status, "spaStaff", null,
                409, ErrorCodes.InvalidTransition);
        foreach (var status in new[] { AppointmentStatus.Pending, AppointmentStatus.Cancelled })
            Add($"complete of a {status} appointment by the manager", status, "manager", null,
                409, ErrorCodes.InvalidTransition);

        Add("complete while a service is not done", AppointmentStatus.InProgress, "spaStaff",
            f => { f.Line.IsDone = false; f.Line.DoneAt = null; },
            409, ErrorCodes.ServicesIncomplete);
        Add("complete without an after photo", AppointmentStatus.InProgress, "spaStaff",
            f => f.Base.Photos.Existing.Clear(),
            409, ErrorCodes.PhotoRequired);
        Add("complete while a cost confirmation is pending", AppointmentStatus.InProgress, "spaStaff",
            f => f.CostConfirmations.Add(new CostConfirmation
            {
                ConfirmationId = Guid.NewGuid(),
                AppointmentId = f.Spa.AppointmentId,
                Status = ConfirmationStatus.Pending,
            }),
            409, ErrorCodes.CostConfirmationPending);

        Check(rows.Count == 14, $"Expected 14 cases but built {rows.Count}.");

        foreach (var row in rows)
        {
            var f = new ProgressFixture(row.Status);
            f.MakeReadyToComplete();
            row.Arrange?.Invoke(f);

            var user = row.Caller switch
            {
                "manager" => f.ManagerUser,
                "customer" => new CurrentUser(Guid.NewGuid(), UserRole.Customer),
                _ => f.Base.SpaStaffUser,
            };
            StaffRole? role = row.Caller switch
            {
                "receptionist" => StaffRole.Receptionist,
                "noProfile" => null,
                _ => StaffRole.SpaStaff,
            };

            var controller = CreateProgressController(f, user, role);
            var response = await ProgressResponseAsync(() => controller.Complete(f.Spa.AppointmentId, CancellationToken.None));

            Check(response.Status == row.HttpStatus && response.Code == row.Code,
                $"{row.Name}: expected {row.HttpStatus} {row.Code} but got {response.Status} {response.Code ?? "success"}.");
            Check(response.ContentType.StartsWith("application/problem+json"),
                $"{row.Name}: the error must use the problem+json envelope.");
            Check(f.Spa.Status == row.Status, $"{row.Name}: the appointment status must not change.");
            Check(f.Payments.AddedPayments.Count == 0 && f.Assignments.SaveCalls == 0,
                $"{row.Name}: no payment may be formed and nothing may be saved.");
            Check(f.Assignments.Added.All(a => a.IsHolding), $"{row.Name}: the staff holds must stay.");
            if (row.BeforeTransaction)
                Check(f.Base.Guard.RunCalls == 0,
                    $"{row.Name}: the request must be refused before any transaction is opened.");
        }

        foreach (var asManager in new[] { false, true })
        {
            var ok = new ProgressFixture(AppointmentStatus.InProgress);
            ok.MakeReadyToComplete();
            var okUser = asManager ? ok.ManagerUser : ok.Base.SpaStaffUser;
            var okResponse = await ProgressResponseAsync(() =>
                CreateProgressController(ok, okUser).Complete(ok.Spa.AppointmentId, CancellationToken.None));

            Check(okResponse.Status == 200 && ok.Spa.Status == AppointmentStatus.Completed
                  && ok.Payments.AddedPayments.Count == 1,
                $"asManager={asManager}: a valid completion must still succeed.");
        }
    }),
    ("AddApplication and AddInfrastructure register the appointment progress service and repository", () =>
    {
        var applicationServices = new ServiceCollection();
        applicationServices.AddApplication();
        var service = applicationServices.FirstOrDefault(d => d.ServiceType == typeof(AppointmentProgressService));
        Check(service is not null && service.Lifetime == ServiceLifetime.Scoped,
            "AppointmentProgressService must be registered as scoped.");

        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:Default"] = "Host=localhost;Database=petspa;Username=test;Password=test",
            ["Jwt:SigningKey"] = "this-is-a-valid-32-byte-secret-key-12345",
            ["Jwt:AccessTokenMinutes"] = "15",
            ["Jwt:RefreshTokenDays"] = "7",
        };
        var infrastructureServices = new ServiceCollection();
        PetSpa.Infrastructure.DependencyInjection.AddInfrastructure(
            infrastructureServices, new ConfigurationBuilder().AddInMemoryCollection(settings).Build());

        var repository = infrastructureServices.FirstOrDefault(d => d.ServiceType == typeof(IAppointmentProgressRepository));
        Check(repository is not null
              && repository.Lifetime == ServiceLifetime.Scoped
              && repository.ImplementationType == typeof(PetSpa.Infrastructure.Persistence.Repositories.AppointmentProgressRepository),
            "IAppointmentProgressRepository must be registered as a scoped AppointmentProgressRepository.");

        return Task.CompletedTask;
    }),
    ("AppointmentsController.RespondCostConfirmation: lịch lưu trú chấp nhận trả cageSuitable trong JSON, lịch spa không có cageSuitable", async () =>
    {
        var ownerId = Guid.NewGuid();

        AppointmentsController ControllerFor(CostConfirmationFixture fixture) =>
            new AppointmentsController(null!, costConfirmationService: fixture.Service)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext
                    {
                        User = new ClaimsPrincipal(new ClaimsIdentity(
                        [
                            new Claim(TokenClaims.UserId, ownerId.ToString()),
                            new Claim(TokenClaims.Role, "Customer"),
                        ], "test")),
                    },
                },
            };

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());

        var cage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = "A1",
            Species = Species.Cat,
            SizeGroup = SizeGroup.Small,
            IsActive = true,
        };
        var stayPet = WeightTestCat(2.8m, SizeGroup.Small);
        var stay = WeightTestHotel(stayPet.PetId, SizeGroup.Small, AppointmentStatus.Confirmed);
        stay.CageId = cage.CageId;
        var stayController = ControllerFor(new CostConfirmationFixture(stay, stayPet, ownerId, cages: new[] { cage }));

        var stayResult = await stayController.RespondCostConfirmation(
            stay.AppointmentId, new CostConfirmationRespondRequest(true), CancellationToken.None) as OkObjectResult;
        Check(stayResult?.Value is CostConfirmationRespondResponse { Status: AppointmentStatus.Confirmed, CageSuitable: false },
            "A stay whose assigned cage is of the old size group must return cageSuitable = false.");
        Check(JsonSerializer.Serialize(stayResult!.Value, options) == "{\"status\":\"Confirmed\",\"cageSuitable\":false}",
            "The stay response must carry cageSuitable in camelCase.");

        var spaPet = WeightTestCat(2.8m, SizeGroup.Small);
        var spa = WeightTestSpa(spaPet.PetId, SizeGroup.Small, AppointmentStatus.Received, DateTimeOffset.UtcNow.AddMinutes(-5));
        var spaController = ControllerFor(new CostConfirmationFixture(spa, spaPet, ownerId));

        var spaResult = await spaController.RespondCostConfirmation(
            spa.AppointmentId, new CostConfirmationRespondRequest(true), CancellationToken.None) as OkObjectResult;
        Check(JsonSerializer.Serialize(spaResult!.Value, options) == "{\"status\":\"Received\"}",
            "A spa response must not carry cageSuitable.");
    }),
    ("PaymentService.RecordCounterAsync: lễ tân và quản lý ghi nhận thanh toán tại quầy, khóa Payment trước khi đọc, lưu một lần", async () =>
    {
        async Task RunAsync(CurrentUser user, StaffRole? role, PaymentMethod method, decimal received)
        {
            var payment = OnlinePayment(PaymentKind.Spa, 150000m);
            var events = new List<string>();
            var repo = new TestPaymentRepo(null)
            {
                Events = events,
                ForUpdate = new PaymentForUpdate(payment, AppointmentStatus.Completed),
            };
            var guard = new TestConcurrencyGuard { Events = events };
            var service = new PaymentService(
                repo, new TestPaymentGateway(), guard, new TestStaffRoleReader(role), new TestCostConfirmationRepo());

            var status = await service.RecordCounterAsync(user, payment.PaymentId, method, received);

            Check(status == PaymentStatus.Paid && payment.Status == PaymentStatus.Paid,
                "An exact or higher amount at the due time must mark the payment Paid.");
            Check(payment.Method == method && payment.ReceivedAmount == received && payment.PaidAt is not null
                    && payment.ConfirmedByUserId == user.UserId,
                "The method, received amount, time and confirmer must be recorded.");
            Check(guard.LockedPaymentId == payment.PaymentId, "The Payment row must be locked.");
            Check(guard.LockedAppointmentId == payment.AppointmentId, "The Appointment row must be locked.");
            Check(events.SequenceEqual(new[] { "run", "lock-payment", "find-for-update", "save" }),
                $"The payment must be read inside the transaction after the lock and saved once, got: {string.Join(",", events)}.");
        }

        await RunAsync(new CurrentUser(Guid.NewGuid(), UserRole.Staff), StaffRole.Receptionist, PaymentMethod.BankQR, 150000m);
        await RunAsync(new CurrentUser(Guid.NewGuid(), UserRole.Manager), null, PaymentMethod.Cash, 200000m);
    }),
    ("PaymentService.RecordCounterAsync từ chối khách hàng, nhân viên spa, nhân viên không có hồ sơ và không đụng tới dữ liệu", async () =>
    {
        foreach (var (user, role) in new (CurrentUser User, StaffRole? Role)[]
        {
            (new CurrentUser(Guid.NewGuid(), UserRole.Customer), null),
            (new CurrentUser(Guid.NewGuid(), UserRole.Staff), StaffRole.SpaStaff),
            (new CurrentUser(Guid.NewGuid(), UserRole.Staff), null),
        })
        {
            var payment = OnlinePayment(PaymentKind.Spa, 150000m);
            var events = new List<string>();
            var repo = new TestPaymentRepo(null)
            {
                Events = events,
                ForUpdate = new PaymentForUpdate(payment, AppointmentStatus.Completed),
            };
            var service = new PaymentService(
                repo, new TestPaymentGateway(), new TestConcurrencyGuard { Events = events },
                new TestStaffRoleReader(role), new TestCostConfirmationRepo());

            var code = await FailureCodeAsync(() => service.RecordCounterAsync(user, payment.PaymentId, PaymentMethod.Cash, 150000m));

            Check(code == ErrorCodes.Forbidden, $"{user.Role}/{role} must be rejected with FORBIDDEN.");
            Check(events.Count == 0 && payment.Status == PaymentStatus.Unpaid,
                "A rejected role must not open a transaction or change the payment.");
        }
    }),
    ("PaymentService.RecordCounterAsync từ chối method Online và khoản không tồn tại", async () =>
    {
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);
        var payment = OnlinePayment(PaymentKind.Spa, 150000m);
        var repo = new TestPaymentRepo(null) { ForUpdate = new PaymentForUpdate(payment, AppointmentStatus.Completed) };
        var service = new PaymentService(
            repo, new TestPaymentGateway(), new TestConcurrencyGuard(), new TestStaffRoleReader(null), new TestCostConfirmationRepo());

        var online = await FailureCodeAsync(() => service.RecordCounterAsync(manager, payment.PaymentId, PaymentMethod.Online, 150000m));
        Check(online == ErrorCodes.ValidationError && payment.Status == PaymentStatus.Unpaid && repo.SaveCalls == 0,
            "The Online method must be rejected with VALIDATION_ERROR without changing anything.");

        var undefined = await FailureCodeAsync(() => service.RecordCounterAsync(manager, payment.PaymentId, (PaymentMethod)99, 150000m));
        Check(undefined == ErrorCodes.ValidationError && payment.Status == PaymentStatus.Unpaid && repo.SaveCalls == 0,
            "An undefined method enum must be rejected with VALIDATION_ERROR without changing anything.");

        var missing = await FailureCodeAsync(() => service.RecordCounterAsync(manager, Guid.NewGuid(), PaymentMethod.Cash, 150000m));
        Check(missing == ErrorCodes.NotFound && repo.SaveCalls == 0,
            "An unknown payment must be rejected with NOT_FOUND.");
    }),
    ("PaymentService.RecordCounterAsync xác minh thời điểm và số tiền trước khi ghi nhận", async () =>
    {
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);

        async Task<(string? Code, Payment Payment, int Saves)> TryAsync(
            PaymentKind kind, AppointmentStatus appointmentStatus, decimal amount, decimal received)
        {
            var payment = OnlinePayment(kind, amount);
            var repo = new TestPaymentRepo(null) { ForUpdate = new PaymentForUpdate(payment, appointmentStatus) };
            var service = new PaymentService(
                repo, new TestPaymentGateway(), new TestConcurrencyGuard(), new TestStaffRoleReader(null), new TestCostConfirmationRepo());
            var code = await FailureCodeAsync(() => service.RecordCounterAsync(manager, payment.PaymentId, PaymentMethod.Cash, received));
            return (code, payment, repo.SaveCalls);
        }

        var notDue = await TryAsync(PaymentKind.Spa, AppointmentStatus.Confirmed, 150000m, 150000m);
        Check(notDue.Code == ErrorCodes.PaymentNotDue && notDue.Payment.Status == PaymentStatus.Unpaid && notDue.Saves == 0,
            "A spa payment before the appointment is Completed must be rejected with PAYMENT_NOT_DUE.");

        var stayNotDue = await TryAsync(PaymentKind.Stay, AppointmentStatus.InStay, 300000m, 300000m);
        Check(stayNotDue.Code == ErrorCodes.PaymentNotDue && stayNotDue.Saves == 0,
            "A stay payment after check-in must be rejected with PAYMENT_NOT_DUE.");

        var lateFee = await TryAsync(PaymentKind.LateFee, AppointmentStatus.InStay, 50000m, 50000m);
        Check(lateFee.Code is null && lateFee.Payment.Status == PaymentStatus.Paid && lateFee.Saves == 1,
            "A late fee is recorded while the stay is InStay.");

        var short1 = await TryAsync(PaymentKind.Spa, AppointmentStatus.Completed, 150000m, 149999m);
        Check(short1.Code == ErrorCodes.AmountMismatch && short1.Payment.Status == PaymentStatus.Unpaid
                && short1.Payment.ReceivedAmount is null && short1.Saves == 0,
            "A received amount below the amount due must be rejected with AMOUNT_MISMATCH and change nothing.");

        var paid = OnlinePayment(PaymentKind.Spa, 150000m);
        var repo = new TestPaymentRepo(null) { ForUpdate = new PaymentForUpdate(paid, AppointmentStatus.Completed) };
        var service = new PaymentService(
            repo, new TestPaymentGateway(), new TestConcurrencyGuard(), new TestStaffRoleReader(null), new TestCostConfirmationRepo());
        await service.RecordCounterAsync(manager, paid.PaymentId, PaymentMethod.Cash, 150000m);
        var repeat = await FailureCodeAsync(() => service.RecordCounterAsync(manager, paid.PaymentId, PaymentMethod.BankQR, 150000m));
        Check(repeat == ErrorCodes.PaymentNotDue && repo.SaveCalls == 1 && paid.Method == PaymentMethod.Cash,
            "Recording a paid payment again must be rejected with PAYMENT_NOT_DUE and keep the first record.");
    }),
    ("PaymentService.RecordCounterAsync chặn khoản lưu trú khi lịch đang chờ xác nhận chi phí mới", async () =>
    {
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);

        async Task<(string? Code, Payment Payment, int Saves)> TryAsync(PaymentKind kind, AppointmentStatus appointmentStatus, bool pending)
        {
            var payment = OnlinePayment(kind, 300000m);
            var confirmations = new TestCostConfirmationRepo();
            if (pending)
            {
                confirmations.Add(new CostConfirmation
                {
                    ConfirmationId = Guid.NewGuid(),
                    AppointmentId = payment.AppointmentId,
                    ActualWeightKg = 6m,
                    NewSizeGroup = SizeGroup.Large,
                    OldAmount = 300000m,
                    NewAmount = 450000m,
                    Status = ConfirmationStatus.Pending,
                    CreatedAt = DateTimeOffset.UtcNow,
                    ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(20),
                });
            }

            var repo = new TestPaymentRepo(null) { ForUpdate = new PaymentForUpdate(payment, appointmentStatus) };
            var service = new PaymentService(
                repo, new TestPaymentGateway(), new TestConcurrencyGuard(), new TestStaffRoleReader(null), confirmations);
            var code = await FailureCodeAsync(() => service.RecordCounterAsync(manager, payment.PaymentId, PaymentMethod.Cash, 300000m));
            return (code, payment, repo.SaveCalls);
        }

        var blocked = await TryAsync(PaymentKind.Stay, AppointmentStatus.Confirmed, pending: true);
        Check(blocked.Code == ErrorCodes.CostConfirmationPending && blocked.Payment.Status == PaymentStatus.Unpaid && blocked.Saves == 0,
            "A stay payment must be rejected with COST_CONFIRMATION_PENDING while a confirmation is pending.");

        var free = await TryAsync(PaymentKind.Stay, AppointmentStatus.Confirmed, pending: false);
        Check(free.Code is null && free.Payment.Status == PaymentStatus.Paid && free.Saves == 1,
            "A stay payment without a pending confirmation must be recorded.");
    }),
    ("CounterPaymentRequestValidator chỉ nhận Cash hoặc BankQR và số tiền trong giới hạn", () =>
    {
        var validator = new CounterPaymentRequestValidator();

        Check(validator.Validate(new CounterPaymentRequest(PaymentMethod.Cash, 150000)).IsValid, "Cash must pass.");
        Check(validator.Validate(new CounterPaymentRequest(PaymentMethod.BankQR, 0)).IsValid, "BankQR with a zero amount must pass.");
        Check(validator.Validate(new CounterPaymentRequest(PaymentMethod.Cash, 999_999_999_999)).IsValid, "The maximum amount must pass.");

        var online = validator.Validate(new CounterPaymentRequest(PaymentMethod.Online, 150000));
        Check(!online.IsValid && online.Errors.Any(e => e.PropertyName == "Method"), "Online must fail validation.");

        var undefined = validator.Validate(new CounterPaymentRequest((PaymentMethod)99, 150000));
        Check(!undefined.IsValid && undefined.Errors.Any(e => e.PropertyName == "Method"), "An undefined method must fail validation.");

        var missingMethod = validator.Validate(new CounterPaymentRequest(null, 150000));
        Check(!missingMethod.IsValid && missingMethod.Errors.Count(e => e.PropertyName == "Method") == 1,
            "A missing method must fail with a single error.");

        var missingAmount = validator.Validate(new CounterPaymentRequest(PaymentMethod.Cash, null));
        Check(!missingAmount.IsValid && missingAmount.Errors.Any(e => e.PropertyName == "ReceivedAmount"),
            "A missing amount must fail validation.");

        Check(!validator.Validate(new CounterPaymentRequest(PaymentMethod.Cash, -1)).IsValid, "A negative amount must fail validation.");
        Check(!validator.Validate(new CounterPaymentRequest(PaymentMethod.Cash, 1_000_000_000_000)).IsValid,
            "An amount above the column limit must fail validation.");
        return Task.CompletedTask;
    }),
    ("PaymentsController.RecordCounter trả PaymentStatusResponse, từ chối body trống và lấy người xác nhận từ token", async () =>
    {
        var managerId = Guid.NewGuid();
        var payment = OnlinePayment(PaymentKind.Stay, 300000m);
        var repo = new TestPaymentRepo(null) { ForUpdate = new PaymentForUpdate(payment, AppointmentStatus.Confirmed) };
        var service = new PaymentService(
            repo, new TestPaymentGateway(), new TestConcurrencyGuard(), new TestStaffRoleReader(null), new TestCostConfirmationRepo());
        var controller = new PaymentsController(service, NullLogger<PaymentsController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(TokenClaims.UserId, managerId.ToString()),
                        new Claim(TokenClaims.Role, "Manager"),
                    ], "test")),
                },
            },
        };

        var missingBody = await FailureCodeAsync(() => controller.RecordCounter(payment.PaymentId, null, CancellationToken.None));
        Check(missingBody == ErrorCodes.ValidationError, "A missing body must throw VALIDATION_ERROR.");

        var result = await controller.RecordCounter(
            payment.PaymentId, new CounterPaymentRequest(PaymentMethod.Cash, 300000), CancellationToken.None) as OkObjectResult;
        Check(result?.Value is PaymentStatusResponse { Status: PaymentStatus.Paid },
            "The action must return Ok with the payment status Paid.");
        Check(payment.ConfirmedByUserId == managerId && payment.Method == PaymentMethod.Cash && payment.ReceivedAmount == 300000m,
            "The confirmer must come from the token and the payment must be recorded.");

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        Check(JsonSerializer.Serialize(result!.Value, options) == "{\"status\":\"Paid\"}",
            "The response must be { status } in camelCase.");
    }),
    ("PaymentService.RecordCounterAsync ném InvalidOperationException khi thiếu dependencies", async () =>
    {
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);
        var onlineOnlyService = new PaymentService(
            new TestPaymentRepo(null), new TestPaymentGateway(), new TestConcurrencyGuard());

        var threw = false;
        try
        {
            await onlineOnlyService.RecordCounterAsync(manager, Guid.NewGuid(), PaymentMethod.Cash, 100000m);
        }
        catch (InvalidOperationException)
        {
            threw = true;
        }

        Check(threw, "Calling RecordCounterAsync without staffRoles and costConfirmations must throw InvalidOperationException.");
    }),
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

static (BookingService Service, TestScheduleRepo Schedule, CurrentUser User, Guid PetId, Guid ServiceId, DateTimeOffset SlotStart)
    CreateSpaSlotScenario(bool slotIsHeld)
{
    var ownerUserId = Guid.NewGuid();
    var petId = Guid.NewGuid();
    var serviceId = Guid.NewGuid();
    var pet = new Pet { PetId = petId, CustomerId = Guid.NewGuid(), Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };
    var service = new Service { ServiceId = serviceId, Name = "Tắm", LatestStartTime = new TimeOnly(18, 0), IsActive = true };
    var pricing = new ServicePricing { ServiceId = serviceId, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 100000, DurationMinutes = 60, StaffRequired = 1 };
    var futureDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2));
    var slotStart = new DateTimeOffset(futureDate.ToDateTime(new TimeOnly(10, 0)), TimeSpan.Zero);
    var shifts = new List<StaffShiftWindow> { new(Guid.NewGuid(), slotStart.AddHours(-1), slotStart.AddHours(4)) };
    var held = new List<HeldSpaBooking>();
    if (slotIsHeld) held.Add(new HeldSpaBooking(slotStart, slotStart.AddMinutes(75), 1));

    var schedule = new TestScheduleRepo(15, false, shifts, held);
    var bookingService = new BookingService(
        new TestPetRepo(pet, ownerUserId),
        new TestStaffRoleReader(null),
        new TestCatalogRepo(new ServiceWithPricing(service, [pricing]), [new TimeOnly(10, 0)]),
        schedule,
        new TestConcurrencyGuard(),
        new ShopTimeZone(TimeZoneInfo.Utc),
        NoNotifier());

    return (bookingService, schedule, new CurrentUser(ownerUserId, UserRole.Customer), petId, serviceId, slotStart);
}

static AppointmentNotifier NoNotifier() => TestNotifiers.NoNotifier();

static async Task<string?> FailureCodeAsync(Func<Task> action)
{
    try
    {
        await action();
        return null;
    }
    catch (BusinessException ex)
    {
        return ex.Code;
    }
}

static AppointmentProgressController CreateProgressController(
    ProgressFixture fixture, CurrentUser user, StaffRole? staffRole = StaffRole.SpaStaff) =>
    new(fixture.CreateService(staffRole))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim(TokenClaims.UserId, user.UserId.ToString()),
                    new Claim(TokenClaims.Role, user.Role.ToString()),
                ], "test")),
            },
        },
    };

static async Task<(int Status, string? Code, string ContentType)> ProgressResponseAsync(Func<Task> call)
{
    var (status, body, contentType) = await RunMiddlewareAsync(async _ => await call());
    if (string.IsNullOrEmpty(body)) return (status, null, contentType);

    using var document = JsonDocument.Parse(body);
    var code = document.RootElement.TryGetProperty("code", out var value) ? value.GetString() : null;
    return (status, code, contentType);
}

static SpaAppointment OldSpaAppointment(AppointmentStatus status, TimeSpan startsIn)
{
    var start = DateTimeOffset.UtcNow.Add(startsIn);
    return new SpaAppointment
    {
        AppointmentId = Guid.NewGuid(),
        CustomerId = Guid.NewGuid(),
        PetId = Guid.NewGuid(),
        SizeGroup = SizeGroup.Small,
        Status = status,
        SlotStart = start,
        SlotEnd = start.AddMinutes(30),
        BusyUntil = start.AddMinutes(45),
        StaffRequired = 1,
    };
}

static HotelAppointment OldHotelAppointment(AppointmentStatus status, TimeSpan startsIn)
{
    var start = DateTimeOffset.UtcNow.Add(startsIn);
    return new HotelAppointment
    {
        AppointmentId = Guid.NewGuid(),
        CustomerId = Guid.NewGuid(),
        PetId = Guid.NewGuid(),
        SizeGroup = SizeGroup.Small,
        Status = status,
        PlannedCheckIn = start,
        PlannedCheckOut = start.AddDays(1),
        CageId = Guid.NewGuid(),
    };
}

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

static Pet WeightTestCat(decimal weightKg, SizeGroup sizeGroup) => new()
{
    PetId = Guid.NewGuid(),
    CustomerId = Guid.NewGuid(),
    Species = Species.Cat,
    WeightKg = weightKg,
    SizeGroup = sizeGroup,
    IsActive = true,
};

static TestPetRepo WeightTestPetRepo(Pet pet) => new(pet, null)
{
    SizeRules = [new SizeRule { Species = Species.Cat, Criterion = SizeCriterion.Weight, SmallUpper = 3m, MediumUpper = 5m }],
    Tolerances =
    [
        new WeightTolerance { Species = Species.Cat, FromGroup = SizeGroup.Small, ToGroup = SizeGroup.Medium, ToleranceKg = 0.5m },
        new WeightTolerance { Species = Species.Cat, FromGroup = SizeGroup.Medium, ToGroup = SizeGroup.Large, ToleranceKg = 0.5m },
    ],
};

static SpaAppointment WeightTestSpa(Guid petId, SizeGroup sizeGroup, AppointmentStatus status, DateTimeOffset slotStart) => new()
{
    AppointmentId = Guid.NewGuid(),
    PetId = petId,
    Status = status,
    SizeGroup = sizeGroup,
    SlotStart = slotStart,
    SlotEnd = slotStart.AddMinutes(120),
    BusyUntil = slotStart.AddMinutes(135),
    StaffRequired = 1,
};

static HotelAppointment WeightTestHotel(Guid petId, SizeGroup sizeGroup, AppointmentStatus status) => new()
{
    AppointmentId = Guid.NewGuid(),
    PetId = petId,
    Status = status,
    SizeGroup = sizeGroup,
    PlannedCheckIn = DateTimeOffset.UtcNow.AddDays(1),
    PlannedCheckOut = DateTimeOffset.UtcNow.AddDays(3),
};

static SpaAmountInput WeightTestSpaAmountInput(Guid serviceId) => new(
    Species.Cat,
    [serviceId],
    [
        new ServicePricing { ServiceId = serviceId, Species = Species.Cat, SizeGroup = SizeGroup.Small, Price = 100000m },
        new ServicePricing { ServiceId = serviceId, Species = Species.Cat, SizeGroup = SizeGroup.Medium, Price = 150000m },
        new ServicePricing { ServiceId = serviceId, Species = Species.Cat, SizeGroup = SizeGroup.Large, Price = 200000m },
    ]);

static TestHotelCatalogRepo WeightTestHotelCatalog() => new()
{
    Prices =
    [
        new HotelPricing { Species = Species.Cat, SizeGroup = SizeGroup.Small, PricePerNight = 100000m, FoodPerNight = 20000m },
        new HotelPricing { Species = Species.Cat, SizeGroup = SizeGroup.Medium, PricePerNight = 150000m, FoodPerNight = 30000m },
    ],
};

static ControllerContext WeightTestManagerContext() => new()
{
    HttpContext = new DefaultHttpContext
    {
        User = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(TokenClaims.UserId, Guid.NewGuid().ToString()),
            new Claim(TokenClaims.Role, "Manager"),
        ], "test")),
    },
};

static void Check(bool condition, string message)
{
    if (!condition)
    {
        throw new InvalidOperationException(message);
    }
}

static void AssertThrows<TException>(Action action, string message) where TException : Exception
{
    try
    {
        action();
    }
    catch (TException)
    {
        return;
    }

    throw new InvalidOperationException(message);
}

static VnpayOptions ValidVnpayOptions() => new()
{
    TmnCode = "TESTCODE",
    ReturnUrl = "https://example.test/payments/vnpay/return",
};

static VnpayOptions ValidVnpayGatewayOptions() => new()
{
    TmnCode = "TESTCODE",
    HashSecret = "SANDBOXSECRETKEY0123456789ABCDEF",
    ReturnUrl = "https://example.test/payments/vnpay/return",
};

static PaymentTransaction VnpayTransaction(
    decimal amount = 150000m,
    string txnRef = "ABC123def456",
    PaymentGateway gateway = PaymentGateway.VNPAY) => new()
    {
        TxnId = Guid.NewGuid(),
        PaymentId = Guid.NewGuid(),
        Gateway = gateway,
        TxnRef = txnRef,
        RequestedAmount = amount,
        CreatedAt = new DateTimeOffset(2026, 11, 12, 10, 0, 0, TimeSpan.Zero),
    };

static Payment OnlinePayment(PaymentKind kind, decimal amount) => new()
{
    PaymentId = Guid.NewGuid(),
    AppointmentId = Guid.NewGuid(),
    Kind = kind,
    Amount = amount,
};

static PaymentCallbackTarget CallbackTarget(
    PaymentKind kind = PaymentKind.Spa,
    decimal amount = 150000m,
    AppointmentStatus appointmentStatus = AppointmentStatus.Completed,
    string txnRef = "ABC123def456")
{
    var payment = OnlinePayment(kind, amount);
    var transaction = VnpayTransaction(amount, txnRef);
    transaction.PaymentId = payment.PaymentId;
    return new PaymentCallbackTarget(transaction, payment, appointmentStatus);
}

static GatewayCallback SuccessCallback(
    PaymentCallbackTarget target, decimal? confirmedAmount = null, bool succeeded = true) =>
    new(target.Transaction.TxnRef, confirmedAmount ?? target.Payment.Amount, succeeded);

static Dictionary<string, string> VnpayCallback(
    string secureHash = "3f12015b70c9d555ab94fb30dfce3cea7d42f1757cc703d88ceef756ac8f4423036c779bd1d435fa0de885fcb7cbdf0ec6c8986a3221ed7a47ce9f0c27b44108") =>
    new(StringComparer.Ordinal)
    {
        ["vnp_Amount"] = "15000000",
        ["vnp_BankCode"] = "NCB",
        ["vnp_BankTranNo"] = "VNP14226112",
        ["vnp_CardType"] = "ATM",
        ["vnp_OrderInfo"] = "Thanh toan lich hen ABC123def456",
        ["vnp_PayDate"] = "20261112170500",
        ["vnp_ResponseCode"] = "00",
        ["vnp_TmnCode"] = "TESTCODE",
        ["vnp_TransactionNo"] = "14226112",
        ["vnp_TransactionStatus"] = "00",
        ["vnp_TxnRef"] = "ABC123def456",
        ["vnp_SecureHash"] = secureHash,
    };

static PaymentsController IpnController(
    TestPaymentGateway gateway, TestPaymentRepo repo, string queryString,
    Microsoft.Extensions.Logging.ILogger<PaymentsController>? logger = null) =>
    new(new PaymentService(repo, gateway, new TestConcurrencyGuard()), logger ?? NullLogger<PaymentsController>.Instance)
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { Request = { QueryString = new QueryString(queryString) } },
        },
    };

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
    public IReadOnlyList<SizeRule> SizeRules { get; init; } = [];
    public IReadOnlyList<WeightTolerance> Tolerances { get; init; } = [];
    public Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(Species species, CancellationToken ct = default) => Task.FromResult(SizeRules);
    public Task<IReadOnlyList<WeightTolerance>> GetWeightTolerancesAsync(Species species, CancellationToken ct = default) => Task.FromResult(Tolerances);
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
    public Guid? LastExcludeAppointmentId { get; private set; }
    public Task<int> GetBufferMinutesAsync(CancellationToken ct = default) => Task.FromResult(bufferMinutes);
    public Task<IReadOnlyList<StaffShiftWindow>> ListActiveSpaStaffShiftsAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default) =>
        Task.FromResult(shifts);
    public Task<IReadOnlyList<HeldSpaBooking>> ListHeldSpaBookingsAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, Guid? excludeAppointmentId = null,
        CancellationToken ct = default)
    {
        LastExcludeAppointmentId = excludeAppointmentId;
        return Task.FromResult(held);
    }
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
    public List<string> Events { get; init; } = [];
    public List<string> LockOrder { get; } = [];
    public bool LockedDay { get; private set; }
    public (Species Species, SizeGroup SizeGroup)? LockedHotelGroup { get; private set; }
    public Guid? LockedAppointmentId { get; private set; }
    public Guid? LockedPaymentId { get; private set; }
    public int RunCalls { get; private set; }
    public bool InsideRun { get; private set; }
    public async Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default)
    {
        RunCalls++;
        Events.Add("run");
        InsideRun = true;
        try
        {
            return await work();
        }
        finally
        {
            InsideRun = false;
        }
    }
    public async Task RunAsync(Func<Task> work, CancellationToken ct = default)
    {
        RunCalls++;
        Events.Add("run");
        InsideRun = true;
        try
        {
            await work();
        }
        finally
        {
            InsideRun = false;
        }
    }
    public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default)
    {
        LockOrder.Add("lock-day");
        LockedDay = true;
        return Task.CompletedTask;
    }
    public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default)
    {
        LockOrder.Add("lock-hotel-group");
        LockedHotelGroup = (species, sizeGroup);
        return Task.CompletedTask;
    }
    public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
    {
        LockOrder.Add("lock-appointment");
        LockedAppointmentId = appointmentId;
        return Task.CompletedTask;
    }
    public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default)
    {
        Events.Add("lock-payment");
        LockedPaymentId = paymentId;
        return Task.CompletedTask;
    }
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

sealed class TestCostConfirmationRepo : ICostConfirmationRepository
{
    public int TimeoutMinutes { get; set; } = 30;
    public List<CostConfirmation> Items { get; } = [];
    public int SaveCalls { get; private set; }

    public Task<int> GetTimeoutMinutesAsync(CancellationToken ct = default) => Task.FromResult(TimeoutMinutes);

    public Task<bool> HasPendingAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult(Items.Any(c => c.AppointmentId == appointmentId && c.Status == ConfirmationStatus.Pending));

    public Task<CostConfirmation?> FindPendingAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult(Items.FirstOrDefault(c => c.AppointmentId == appointmentId && c.Status == ConfirmationStatus.Pending));

    public void Add(CostConfirmation confirmation) => Items.Add(confirmation);

    public Task SaveChangesAsync(CancellationToken ct = default)
    {
        SaveCalls++;
        return Task.CompletedTask;
    }
}

sealed class CostConfirmationFixture
{
    public CostConfirmationFixture(
        Appointment appointment,
        Pet pet,
        Guid? ownerUserId,
        StaffRole? staffRole = null,
        bool withPending = true,
        int expiresInMinutes = 20,
        IReadOnlyList<Cage>? cages = null)
    {
        Appointment = appointment;
        Pet = pet;
        Changes = new TestAppointmentChangeRepo(appointment, ownerUserId, 60);
        Confirmations = new TestCostConfirmationRepo();
        Guard = new TestConcurrencyGuard();

        if (withPending)
        {
            Confirmations.Add(new CostConfirmation
            {
                ConfirmationId = Guid.NewGuid(),
                AppointmentId = appointment.AppointmentId,
                ActualWeightKg = 3.4m,
                NewSizeGroup = SizeGroup.Medium,
                OldAmount = 100000m,
                NewAmount = 150000m,
                Status = ConfirmationStatus.Pending,
                CreatedAt = DateTimeOffset.UtcNow,
                ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(expiresInMinutes),
            });
        }

        var petRepo = new TestPetRepo(pet, ownerUserId)
        {
            SizeRules = [new SizeRule { Species = Species.Cat, Criterion = SizeCriterion.Weight, SmallUpper = 3m, MediumUpper = 5m }],
        };

        Service = new CostConfirmationService(
            Changes, Confirmations, petRepo, new TestHotelAssignmentRepo(null, cages ?? [], []), Guard,
            new TestStaffRoleReader(staffRole));
    }

    public Appointment Appointment { get; }
    public Pet Pet { get; }
    public TestAppointmentChangeRepo Changes { get; }
    public TestCostConfirmationRepo Confirmations { get; }
    public TestConcurrencyGuard Guard { get; }
    public CostConfirmationService Service { get; }

    public CostConfirmation Confirmation => Confirmations.Items.Single();
}

sealed class TestAppointmentQueryRepo : IAppointmentQueryRepository
{
    public int ListAllCalls { get; private set; }
    public int ListByCustomerCalls { get; private set; }
    public int ListBySpaStaffCalls { get; private set; }
    public Guid? LastListAllPetId { get; private set; }
    public Guid? LastSpaStaffUserId { get; private set; }
    public Guid? LastSpaStaffPetId { get; private set; }
    public AppointmentDetailData? DetailResult { get; set; }
    public bool AssignedResult { get; set; }

    public Task<PagedResult<AppointmentListItem>> ListByCustomerUserAsync(
        Guid customerUserId, AppointmentType? type, AppointmentStatus? status, Guid? petId, int page, int pageSize,
        CancellationToken ct = default)
    {
        ListByCustomerCalls++;
        return Task.FromResult(new PagedResult<AppointmentListItem>([], page, pageSize, 0));
    }

    public Task<PagedResult<AppointmentListItem>> ListAllAsync(
        AppointmentType? type, AppointmentStatus? status, Guid? petId, int page, int pageSize, CancellationToken ct = default)
    {
        ListAllCalls++;
        LastListAllPetId = petId;
        return Task.FromResult(new PagedResult<AppointmentListItem>([], page, pageSize, 0));
    }

    public Task<PagedResult<AppointmentListItem>> ListBySpaStaffUserAsync(
        Guid staffUserId, AppointmentType? type, AppointmentStatus? status, Guid? petId, int page, int pageSize,
        CancellationToken ct = default)
    {
        ListBySpaStaffCalls++;
        LastSpaStaffUserId = staffUserId;
        LastSpaStaffPetId = petId;
        return Task.FromResult(new PagedResult<AppointmentListItem>([], page, pageSize, 0));
    }

    public Task<AppointmentDetailData?> FindDetailAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult(DetailResult);

    public Task<bool> IsAssignedToSpaStaffAsync(Guid appointmentId, Guid staffUserId, CancellationToken ct = default) =>
        Task.FromResult(AssignedResult);

    public Func<Guid, AppointmentType?>? FindTypeHandler { get; set; }

    public Task<AppointmentType?> FindTypeAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult(FindTypeHandler is not null ? FindTypeHandler(appointmentId) : null);
}

sealed class TestAssignmentRepo(
    SpaAppointment? appointment,
    IReadOnlyList<SpaStaffCandidate> staff,
    IReadOnlyList<StaffBusyWindow> busy,
    IReadOnlyDictionary<Guid, int> recentCounts) : IAssignmentRepository
{
    public Guid? LastExcludeAppointmentId { get; private set; }
    public List<SpaAppointment> Others { get; } = [];

    public Task<IReadOnlyList<SpaStaffCandidate>> ListActiveSpaStaffAsync(CancellationToken ct = default) =>
        Task.FromResult(staff);

    public Task<IReadOnlyList<StaffBusyWindow>> ListHoldingStaffWindowsAsync(
        DateTimeOffset rangeStart,
        DateTimeOffset rangeEnd,
        Guid? excludeAppointmentId = null,
        CancellationToken ct = default)
    {
        LastExcludeAppointmentId = excludeAppointmentId;
        return Task.FromResult(busy);
    }

    public Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult(appointment is not null && appointment.AppointmentId == appointmentId
            ? appointment
            : Others.FirstOrDefault(a => a.AppointmentId == appointmentId));

    public Task<int> GetSuggestLookbackDaysAsync(CancellationToken ct = default) => Task.FromResult(30);

    public int HoldMinutes { get; set; } = 15;

    public Task<int> GetHoldMinutesAsync(CancellationToken ct = default) => Task.FromResult(HoldMinutes);

    public Task<IReadOnlyDictionary<Guid, int>> CountRecentAssignmentsAsync(
        DateTimeOffset since, CancellationToken ct = default) =>
        Task.FromResult(recentCounts);

    public List<AppointmentStaff> Added { get; } = [];

    public Task SetStaffAssignmentsAsync(
        Guid appointmentId,
        IReadOnlyList<AppointmentStaff> staffAssignments,
        CancellationToken ct = default)
    {
        Added.RemoveAll(a => a.AppointmentId == appointmentId);
        Added.AddRange(staffAssignments);
        return Task.CompletedTask;
    }

    public Task AddStaffAssignmentsAsync(
        IReadOnlyList<AppointmentStaff> staffAssignments, CancellationToken ct = default)
    {
        if (staffAssignments.Count == 0) return Task.CompletedTask;
        return SetStaffAssignmentsAsync(staffAssignments[0].AppointmentId, staffAssignments, ct);
    }

    public int SaveCalls { get; private set; }

    public Task<int> CountActiveHoldingStaffAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult(Added.Count(a => a.AppointmentId == appointmentId && a.IsHolding));

    public Task ReleaseStaffHoldsAsync(Guid appointmentId, CancellationToken ct = default)
    {
        foreach (var row in Added.Where(a => a.AppointmentId == appointmentId))
        {
            row.IsHolding = false;
        }

        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
    {
        SaveCalls++;
        return Task.CompletedTask;
    }

    public Task UpdateSpaAppointmentAsync(SpaAppointment appointment, CancellationToken ct = default)
    {
        SaveCalls++;
        return Task.CompletedTask;
    }

    public SpaAmountInput? AmountInput { get; set; }

    public Task<SpaAmountInput?> GetSpaAmountInputAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult(AmountInput);
}

sealed class TestHotelBookingRepo(int activeCages, IReadOnlyList<HeldHotelStay> held) : IHotelBookingRepository
{
    public Species? LastSpecies { get; private set; }
    public SizeGroup? LastSizeGroup { get; private set; }
    public Guid? LastExcludeAppointmentId { get; private set; }

    public Task<int> CountActiveCagesAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default)
    {
        LastSpecies = species;
        LastSizeGroup = sizeGroup;
        return Task.FromResult(activeCages);
    }

    public Task<IReadOnlyList<HeldHotelStay>> ListHeldHotelStaysAsync(
        Species species, SizeGroup sizeGroup, DateTimeOffset rangeStart, DateTimeOffset rangeEnd,
        Guid? excludeAppointmentId = null, CancellationToken ct = default)
    {
        LastExcludeAppointmentId = excludeAppointmentId;
        return Task.FromResult(held);
    }

    public List<HotelAppointment> AddedAppointments { get; } = [];
    public bool IsLocked { get; set; }

    public Task<bool> IsBookingLockedAsync(Guid customerId, CancellationToken ct = default) =>
        Task.FromResult(IsLocked);

    public Task AddHotelAppointmentAsync(HotelAppointment appointment, CancellationToken ct = default)
    {
        AddedAppointments.Add(appointment);
        return Task.CompletedTask;
    }
}

sealed class TestHotelAssignmentRepo(
    HotelStayForAssignment? stay,
    IReadOnlyList<Cage> cages,
    IReadOnlyList<CageStayWindow> windows) : IHotelAssignmentRepository
{
    public Task<HotelStayForAssignment?> FindHotelStayAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult(stay is not null && stay.AppointmentId == appointmentId ? stay : null);

    public Task<IReadOnlyList<Cage>> ListCagesAsync(CancellationToken ct = default) => Task.FromResult(cages);

    public Task<IReadOnlyList<CageStayWindow>> ListCageStayWindowsAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default) =>
        Task.FromResult(windows);

    public HotelAppointment? Appointment { get; init; }
    public Species AppointmentSpecies { get; init; } = Species.Dog;
    public int SaveCalls { get; private set; }

    public Task<HotelAppointmentForAssignment?> FindHotelAppointmentAsync(
        Guid appointmentId, CancellationToken ct = default)
    {
        HotelAppointmentForAssignment? found = Appointment is not null && Appointment.AppointmentId == appointmentId
            ? new HotelAppointmentForAssignment(Appointment, AppointmentSpecies)
            : null;
        return Task.FromResult(found);
    }

    public Task<HotelAppointment?> FindAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult(Appointment is not null && Appointment.AppointmentId == appointmentId ? Appointment : null);

    public Task<Cage?> FindCageAsync(Guid cageId, CancellationToken ct = default) =>
        Task.FromResult(cages.FirstOrDefault(c => c.CageId == cageId));

    public Task UpdateHotelAppointmentAsync(HotelAppointment appointment, CancellationToken ct = default)
    {
        SaveCalls++;
        return Task.CompletedTask;
    }
}

sealed class ConcurrentTestHotelAssignmentRepo(
    Dictionary<Guid, HotelAppointment> appointments,
    IReadOnlyList<Cage> cages,
    object syncRoot) : IHotelAssignmentRepository
{
    public Task<HotelStayForAssignment?> FindHotelStayAsync(Guid appointmentId, CancellationToken ct = default)
    {
        lock (syncRoot)
        {
            if (appointments.TryGetValue(appointmentId, out var stay))
                return Task.FromResult<HotelStayForAssignment?>(new HotelStayForAssignment(
                    stay.AppointmentId, stay.Status, Species.Dog, stay.SizeGroup, stay.PlannedCheckIn, stay.PlannedCheckOut));
            return Task.FromResult<HotelStayForAssignment?>(null);
        }
    }

    public Task<HotelAppointment?> FindAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
    {
        lock (syncRoot)
        {
            appointments.TryGetValue(appointmentId, out var stay);
            return Task.FromResult(stay);
        }
    }

    public Task<HotelAppointmentForAssignment?> FindHotelAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
    {
        lock (syncRoot)
        {
            if (appointments.TryGetValue(appointmentId, out var stay))
                return Task.FromResult<HotelAppointmentForAssignment?>(new HotelAppointmentForAssignment(stay, Species.Dog));
            return Task.FromResult<HotelAppointmentForAssignment?>(null);
        }
    }

    public Task<IReadOnlyList<Cage>> ListCagesAsync(CancellationToken ct = default) => Task.FromResult(cages);

    public Task<IReadOnlyList<CageStayWindow>> ListCageStayWindowsAsync(
        DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default)
    {
        lock (syncRoot)
        {
            var windows = appointments.Values
                .Where(s => s.CageId != null && (s.Status == AppointmentStatus.Confirmed || s.Status == AppointmentStatus.InStay))
                .Select(s => new CageStayWindow(s.CageId!.Value, s.PlannedCheckIn, s.PlannedCheckOut))
                .ToList();
            return Task.FromResult<IReadOnlyList<CageStayWindow>>(windows);
        }
    }

    public Task<Cage?> FindCageAsync(Guid cageId, CancellationToken ct = default) =>
        Task.FromResult(cages.FirstOrDefault(c => c.CageId == cageId));

    public Task UpdateHotelAppointmentAsync(HotelAppointment appointment, CancellationToken ct = default)
    {
        lock (syncRoot)
        {
            appointments[appointment.AppointmentId] = appointment;
            return Task.CompletedTask;
        }
    }
}

sealed class SimulatedAdvisoryConcurrencyGuard : IConcurrencyGuard
{
    private readonly SemaphoreSlim _groupLock = new(1, 1);
    private readonly AsyncLocal<LockState?> _state = new();

    private sealed class LockState
    {
        public bool HoldsLock;
    }

    public async Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default)
    {
        var state = new LockState();
        _state.Value = state;
        try
        {
            return await work();
        }
        finally
        {
            if (state.HoldsLock)
            {
                state.HoldsLock = false;
                _groupLock.Release();
            }
            _state.Value = null;
        }
    }

    public async Task RunAsync(Func<Task> work, CancellationToken ct = default)
    {
        var state = new LockState();
        _state.Value = state;
        try
        {
            await work();
        }
        finally
        {
            if (state.HoldsLock)
            {
                state.HoldsLock = false;
                _groupLock.Release();
            }
            _state.Value = null;
        }
    }

    public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) => Task.CompletedTask;

    public async Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default)
    {
        await _groupLock.WaitAsync(ct);
        if (_state.Value != null)
            _state.Value.HoldsLock = true;
    }

    public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default) => Task.CompletedTask;

    public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default) => Task.CompletedTask;
}

sealed class MissingPetTestHotelAssignmentRepo(HotelAppointment appointment) : IHotelAssignmentRepository
{
    public Task<HotelStayForAssignment?> FindHotelStayAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult<HotelStayForAssignment?>(null);
    public Task<HotelAppointment?> FindAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult<HotelAppointment?>(appointment.AppointmentId == appointmentId ? appointment : null);
    public Task<HotelAppointmentForAssignment?> FindHotelAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult<HotelAppointmentForAssignment?>(null);
    public Task<IReadOnlyList<Cage>> ListCagesAsync(CancellationToken ct = default) => Task.FromResult<IReadOnlyList<Cage>>([]);
    public Task<IReadOnlyList<CageStayWindow>> ListCageStayWindowsAsync(DateTimeOffset start, DateTimeOffset end, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<CageStayWindow>>([]);
    public Task<Cage?> FindCageAsync(Guid cageId, CancellationToken ct = default) => Task.FromResult<Cage?>(null);
    public Task UpdateHotelAppointmentAsync(HotelAppointment app, CancellationToken ct = default) => Task.CompletedTask;
}

sealed class TestAppointmentChangeRepo(
    Appointment? appointment,
    Guid? ownerUserId,
    int deadlineMinutes,
    Action<Appointment>? beforeFindForUpdate = null) : IAppointmentChangeRepository
{
    public int DeadlineReads { get; private set; }
    public List<IReadOnlyList<Guid>> SavedSpaServiceIds { get; } = [];
    public int SavedHotelChanges { get; private set; }
    public List<Guid> HoldingStaffIds { get; } = [];

    public Task<IReadOnlyList<Guid>> ListHoldingStaffIdsAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<Guid>>(HoldingStaffIds.ToList());

    public Task<int> GetChangeCancelDeadlineMinutesAsync(CancellationToken ct = default)
    {
        DeadlineReads++;
        return Task.FromResult(deadlineMinutes);
    }

    public Task<AppointmentChangeTarget?> FindTargetAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult<AppointmentChangeTarget?>(
            appointment is not null && appointment.AppointmentId == appointmentId
                ? new AppointmentChangeTarget(appointment, ownerUserId)
                : null);

    public Task<Appointment?> FindForUpdateAsync(Guid appointmentId, CancellationToken ct = default)
    {
        if (appointment is null || appointment.AppointmentId != appointmentId)
            return Task.FromResult<Appointment?>(null);

        beforeFindForUpdate?.Invoke(appointment);
        return Task.FromResult<Appointment?>(appointment);
    }

    public Task SaveSpaChangeAsync(
        SpaAppointment changed, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default)
    {
        SavedSpaServiceIds.Add(serviceIds);
        return Task.CompletedTask;
    }

    public Task SaveHotelChangeAsync(HotelAppointment changed, CancellationToken ct = default)
    {
        SavedHotelChanges++;
        return Task.CompletedTask;
    }

    public List<Appointment> SavedCancellations { get; } = [];

    public Task SaveCancellationAsync(Appointment cancelled, CancellationToken ct = default)
    {
        SavedCancellations.Add(cancelled);
        return Task.CompletedTask;
    }
}

sealed class ChangeFixture
{
    public ChangeFixture(
        Appointment appointment,
        int deadlineMinutes = 60,
        bool slotIsHeld = false,
        bool hotelIsFull = false,
        bool petBelongsToOther = false,
        Action<Appointment>? beforeFindForUpdate = null)
    {
        OwnerUserId = Guid.NewGuid();
        CustomerUserId = OwnerUserId;
        Pet = new Pet
        {
            PetId = Guid.NewGuid(),
            CustomerId = Guid.NewGuid(),
            Species = Species.Dog,
            SizeGroup = SizeGroup.Medium,
            IsActive = true,
        };
        ServiceId = Guid.NewGuid();

        var service = new Service { ServiceId = ServiceId, Name = "Tắm", LatestStartTime = new TimeOnly(18, 0), IsActive = true };
        var pricing = new ServicePricing
        {
            ServiceId = ServiceId,
            Species = Species.Dog,
            SizeGroup = SizeGroup.Medium,
            Price = 100000,
            DurationMinutes = 60,
            StaffRequired = 1,
        };

        var newDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3));
        NewSlot = new DateTimeOffset(newDate.ToDateTime(new TimeOnly(10, 0)), TimeSpan.Zero);
        NewCheckOut = NewSlot.AddDays(2);

        var heldSpa = new List<HeldSpaBooking>();
        if (slotIsHeld) heldSpa.Add(new HeldSpaBooking(NewSlot, NewSlot.AddMinutes(75), 1));
        var shifts = new List<StaffShiftWindow> { new(Guid.NewGuid(), NewSlot.AddHours(-1), NewSlot.AddHours(4)) };
        var heldStays = new List<HeldHotelStay>();
        if (hotelIsFull) heldStays.Add(new HeldHotelStay(NewSlot, NewCheckOut));

        Changes = new TestAppointmentChangeRepo(appointment, OwnerUserId, deadlineMinutes, beforeFindForUpdate);
        Schedule = new TestScheduleRepo(15, false, shifts, heldSpa);
        HotelRepo = new TestHotelBookingRepo(1, heldStays);
        Guard = new TestConcurrencyGuard();

        Notices = new TestNotificationRepo(() => Guard.InsideRun);
        NotificationReader = new TestAppointmentNotificationReader(
            _ => new AppointmentNotificationContext(appointment, CustomerUserId, StaffUserIds.ToList()));
        var notifier = new AppointmentNotifier(
            NotificationReader, new NotificationService(Notices), new ShopTimeZone(TimeZoneInfo.Utc));

        var petRepo = new TestPetRepo(Pet, petBelongsToOther ? Guid.NewGuid() : OwnerUserId);
        var shopZone = new ShopTimeZone(TimeZoneInfo.Utc);
        var bookingService = new BookingService(
            petRepo,
            new TestStaffRoleReader(null),
            new TestCatalogRepo(new ServiceWithPricing(service, [pricing]), [new TimeOnly(10, 0)]),
            Schedule,
            Guard,
            shopZone,
            TestNotifiers.NoNotifier());
        var hotelService = new HotelBookingService(
            petRepo, new TestStaffRoleReader(null), HotelRepo, new TestHotelCatalogRepo(), shopZone, Guard, TestNotifiers.NoNotifier());

        ChangeService = new AppointmentChangeService(Changes, bookingService, hotelService, petRepo, Guard, notifier);
    }

    public Guid OwnerUserId { get; }
    public Guid CustomerUserId { get; }
    public List<Guid> StaffUserIds { get; } = [];
    public TestNotificationRepo Notices { get; }
    public TestAppointmentNotificationReader NotificationReader { get; }
    public Pet Pet { get; }
    public Guid ServiceId { get; }
    public DateTimeOffset NewSlot { get; }
    public DateTimeOffset NewCheckOut { get; }
    public TestAppointmentChangeRepo Changes { get; }
    public TestScheduleRepo Schedule { get; }
    public TestHotelBookingRepo HotelRepo { get; }
    public TestConcurrencyGuard Guard { get; }
    public AppointmentChangeService ChangeService { get; }

    public CurrentUser Customer => new(OwnerUserId, UserRole.Customer);
    public AppointmentChange SpaChange => new(Pet.PetId, NewSlot, [ServiceId], null, null);
    public AppointmentChange HotelChange => new(Pet.PetId, null, null, NewSlot, NewCheckOut);
}

sealed class InterventionFixture
{
    public InterventionFixture(
        Appointment appointment,
        bool slotIsHeld = false,
        bool hotelIsFull = false,
        bool petBelongsToOther = false,
        bool staffInShift = true,
        bool holdsStaff = false,
        bool busyForStaff = false,
        Action<Appointment>? beforeFindForUpdate = null)
    {
        Appointment = appointment;
        Pet = new Pet
        {
            PetId = Guid.NewGuid(),
            CustomerId = petBelongsToOther ? Guid.NewGuid() : appointment.CustomerId,
            Species = Species.Dog,
            SizeGroup = SizeGroup.Medium,
            IsActive = true,
        };
        ServiceId = Guid.NewGuid();
        Staff = new SpaStaffCandidate(Guid.NewGuid(), "An");
        Cage = new Cage { CageId = Guid.NewGuid(), Code = "A1", Species = Species.Dog, SizeGroup = SizeGroup.Medium, IsActive = true };

        var service = new Service { ServiceId = ServiceId, Name = "Tắm", LatestStartTime = new TimeOnly(18, 0), IsActive = true };
        var pricing = new ServicePricing
        {
            ServiceId = ServiceId,
            Species = Species.Dog,
            SizeGroup = SizeGroup.Medium,
            Price = 100000,
            DurationMinutes = 60,
            StaffRequired = 1,
        };

        var newDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3));
        NewSlot = new DateTimeOffset(newDate.ToDateTime(new TimeOnly(10, 0)), TimeSpan.Zero);
        NewCheckOut = NewSlot.AddDays(2);

        var heldSpa = new List<HeldSpaBooking>();
        if (slotIsHeld) heldSpa.Add(new HeldSpaBooking(NewSlot, NewSlot.AddMinutes(75), 1));

        var shiftStaffId = staffInShift ? Staff.StaffId : Guid.NewGuid();
        var shifts = new List<StaffShiftWindow> { new(shiftStaffId, NewSlot.AddHours(-1), NewSlot.AddHours(4)) };

        var busyWindows = new List<StaffBusyWindow>();
        if (busyForStaff) busyWindows.Add(new StaffBusyWindow(Staff.StaffId, NewSlot, NewSlot.AddMinutes(75)));

        var heldStays = new List<HeldHotelStay>();
        if (hotelIsFull) heldStays.Add(new HeldHotelStay(NewSlot, NewCheckOut));

        Changes = new TestAppointmentChangeRepo(appointment, Guid.NewGuid(), 60, beforeFindForUpdate);
        if (holdsStaff) Changes.HoldingStaffIds.Add(Staff.StaffId);
        Assignments = new TestAssignmentRepo(null, [Staff], busyWindows, new Dictionary<Guid, int>());
        Schedule = new TestScheduleRepo(15, false, shifts, heldSpa);
        HotelRepo = new TestHotelBookingRepo(1, heldStays);
        HotelAssignments = new TestHotelAssignmentRepo(null, [Cage], CageWindows);
        Guard = new TestConcurrencyGuard();

        CustomerUserId = Guid.NewGuid();
        Notices = new TestNotificationRepo(() => Guard.InsideRun);
        NotificationReader = new TestAppointmentNotificationReader(
            _ => new AppointmentNotificationContext(appointment, CustomerUserId, StaffUserIds.ToList()));
        var notifier = new AppointmentNotifier(
            NotificationReader, new NotificationService(Notices), new ShopTimeZone(TimeZoneInfo.Utc));

        var petRepo = new TestPetRepo(Pet, Guid.NewGuid());
        var shopZone = new ShopTimeZone(TimeZoneInfo.Utc);
        var bookingService = new BookingService(
            petRepo,
            new TestStaffRoleReader(null),
            new TestCatalogRepo(new ServiceWithPricing(service, [pricing]), [new TimeOnly(10, 0)]),
            Schedule,
            Guard,
            shopZone,
            TestNotifiers.NoNotifier());
        var hotelService = new HotelBookingService(
            petRepo, new TestStaffRoleReader(null), HotelRepo, new TestHotelCatalogRepo(), shopZone, Guard, TestNotifiers.NoNotifier());

        Intervention = new AppointmentInterventionService(
            Changes, Assignments, Schedule, HotelAssignments, bookingService, hotelService, petRepo, Guard, shopZone, notifier);
    }

    public Guid CustomerUserId { get; }
    public List<Guid> StaffUserIds { get; } = [];
    public TestNotificationRepo Notices { get; }
    public TestAppointmentNotificationReader NotificationReader { get; }
    public Appointment Appointment { get; }
    public Pet Pet { get; }
    public Guid ServiceId { get; }
    public SpaStaffCandidate Staff { get; }
    public Cage Cage { get; }
    public DateTimeOffset NewSlot { get; }
    public DateTimeOffset NewCheckOut { get; }
    public List<CageStayWindow> CageWindows { get; } = [];
    public TestAppointmentChangeRepo Changes { get; }
    public TestAssignmentRepo Assignments { get; }
    public TestScheduleRepo Schedule { get; }
    public TestHotelBookingRepo HotelRepo { get; }
    public TestHotelAssignmentRepo HotelAssignments { get; }
    public TestConcurrencyGuard Guard { get; }
    public AppointmentInterventionService Intervention { get; }

    public CurrentUser Manager => new(Guid.NewGuid(), UserRole.Manager);

    public ManagerAppointmentChange SpaChange(IReadOnlyCollection<Guid>? staffIds = null, bool confirmOutOfShift = false) =>
        new(Pet.PetId, NewSlot, [ServiceId], null, null, staffIds, null, confirmOutOfShift);

    public ManagerAppointmentChange HotelChange(Guid? cageId = null) =>
        new(Pet.PetId, null, null, NewSlot, NewCheckOut, null, cageId, false);
}

sealed class TestPaymentRepo(PaymentWithOwner? found, PaymentCallbackTarget? callbackTarget = null) : IPaymentRepository
{
    public List<PaymentTransaction> Added { get; } = [];
    public List<Payment> AddedPayments { get; } = [];
    public void Add(Payment payment) => AddedPayments.Add(payment);
    public List<string> Events { get; init; } = [];
    public int SaveCalls { get; private set; }
    public PaymentForUpdate? ForUpdate { get; init; }
    public Task<PaymentForUpdate?> FindForUpdateAsync(Guid paymentId, CancellationToken ct = default)
    {
        Events.Add("find-for-update");
        return Task.FromResult(ForUpdate is not null && ForUpdate.Payment.PaymentId == paymentId ? ForUpdate : null);
    }
    public Task<IReadOnlyList<Payment>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<Payment>>([]);
    public Task<PagedResult<Payment>> ListAsync(PaymentStatus? status, int page, int pageSize, CancellationToken ct = default) =>
        Task.FromResult(new PagedResult<Payment>([], page, pageSize, 0));
    public Task<PaymentWithOwner?> FindWithOwnerAsync(Guid paymentId, CancellationToken ct = default) =>
        Task.FromResult(found is not null && found.Payment.PaymentId == paymentId ? found : null);
    public Task AddTransactionAsync(PaymentTransaction transaction, CancellationToken ct = default)
    {
        Added.Add(transaction);
        return Task.CompletedTask;
    }
    public Task<Guid?> FindPaymentIdByTxnRefAsync(string txnRef, CancellationToken ct = default)
    {
        Events.Add("find-id");
        return Task.FromResult(callbackTarget is not null && callbackTarget.Transaction.TxnRef == txnRef
            ? (Guid?)callbackTarget.Payment.PaymentId
            : null);
    }
    public Task<PaymentCallbackTarget?> FindCallbackTargetAsync(string txnRef, CancellationToken ct = default)
    {
        Events.Add("find-target");
        return Task.FromResult(callbackTarget is not null && callbackTarget.Transaction.TxnRef == txnRef
            ? callbackTarget
            : null);
    }
    public Task SaveChangesAsync(CancellationToken ct = default)
    {
        Events.Add("save");
        SaveCalls++;
        return Task.CompletedTask;
    }
}

sealed class TestPaymentGateway : IPaymentGateway
{
    public string Url { get; } = "https://gateway.test/pay?token=abc";
    public int Calls { get; private set; }
    public PaymentTransaction? LastTransaction { get; private set; }
    public string? LastClientIp { get; private set; }
    public Exception? Failure { get; init; }
    public bool CallbackSignatureValid { get; init; }
    public GatewayCallback? Callback { get; init; }
    public int VerifyCalls { get; private set; }
    public int ReadCalls { get; private set; }
    public IReadOnlyDictionary<string, string>? LastCallback { get; private set; }
    public PaymentGateway Gateway => PaymentGateway.VNPAY;
    public string CreatePaymentUrl(PaymentTransaction transaction, string clientIp)
    {
        Calls++;
        if (Failure is not null) throw Failure;
        LastTransaction = transaction;
        LastClientIp = clientIp;
        return Url;
    }
    public bool VerifyCallbackSignature(IReadOnlyDictionary<string, string> parameters)
    {
        VerifyCalls++;
        LastCallback = parameters;
        return CallbackSignatureValid;
    }
    public GatewayCallback? ReadCallback(IReadOnlyDictionary<string, string> parameters)
    {
        ReadCalls++;
        return Callback;
    }
}

sealed class CapturingLogger<T> : Microsoft.Extensions.Logging.ILogger<T>
{
    public List<(Microsoft.Extensions.Logging.LogLevel Level, string Message)> Entries { get; } = [];
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(Microsoft.Extensions.Logging.LogLevel logLevel) => true;
    public void Log<TState>(
        Microsoft.Extensions.Logging.LogLevel logLevel, Microsoft.Extensions.Logging.EventId eventId, TState state,
        Exception? exception, Func<TState, Exception?, string> formatter) =>
        Entries.Add((logLevel, formatter(state, exception)));
}

sealed class TrackingConcurrencyGuard : IConcurrencyGuard
{
    public bool InsideRun { get; private set; }
    public int RunCalls { get; private set; }
    public List<Guid> LockedAppointments { get; } = [];

    public async Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default)
    {
        RunCalls++;
        InsideRun = true;
        try
        {
            return await work();
        }
        finally
        {
            InsideRun = false;
        }
    }

    public Task RunAsync(Func<Task> work, CancellationToken ct = default) =>
        RunAsync<object?>(async () =>
        {
            await work();
            return null;
        }, ct);

    public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) => throw new NotSupportedException();

    public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
        throw new NotSupportedException();

    public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
    {
        if (!InsideRun) throw new InvalidOperationException("Khóa lịch chỉ dùng được bên trong RunAsync.");
        LockedAppointments.Add(appointmentId);
        return Task.CompletedTask;
    }

    public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default) => throw new NotSupportedException();
}

sealed class TestStaffRepo(IReadOnlyList<StaffConfirmedSpaAssignment> confirmed) : IStaffRepository
{
    public bool StaffExists { get; init; } = true;
    public Func<Guid, bool> StillAssigned { get; init; } = _ => true;
    public int DeactivateCalls { get; private set; }

    public Task<Guid> CreateAsync(
        string phone, string fullName, StaffRole staffRole, string password, CancellationToken ct = default) =>
        throw new NotSupportedException();

    public Task<PagedResult<StaffSummary>> ListAsync(int page, int pageSize, CancellationToken ct = default) =>
        throw new NotSupportedException();

    public Task UpdateAsync(Guid staffId, string fullName, StaffRole staffRole, CancellationToken ct = default) =>
        throw new NotSupportedException();

    public Task DeactivateAsync(Guid staffId, CancellationToken ct = default)
    {
        DeactivateCalls++;
        if (!StaffExists) throw new BusinessException(ErrorCodes.NotFound);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Guid>> ListConfirmedSpaAppointmentIdsAsync(Guid staffId, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<Guid>>(confirmed.Select(x => x.AppointmentId).ToList());

    public Task<StaffConfirmedSpaAssignment?> FindConfirmedSpaAssignmentAsync(
        Guid staffId, Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult<StaffConfirmedSpaAssignment?>(
            StillAssigned(appointmentId) ? confirmed.FirstOrDefault(x => x.AppointmentId == appointmentId) : null);
}

sealed record CreatedNotification(
    Guid RecipientUserId, NotificationType Type, Guid? AppointmentId, string Message, bool InsideTransaction);

sealed class TestNotificationRepo(Func<bool> insideTransaction) : INotificationRepository
{
    public List<CreatedNotification> Created { get; } = [];

    public Task<Guid> AddAsync(
        Guid recipientUserId, NotificationType type, Guid? appointmentId, string message,
        CancellationToken ct = default)
    {
        Created.Add(new CreatedNotification(recipientUserId, type, appointmentId, message, insideTransaction()));
        return Task.FromResult(Guid.NewGuid());
    }

    public Task<PagedResult<Notification>> ListByRecipientAsync(
        Guid recipientUserId, int page, int pageSize, CancellationToken ct = default) =>
        throw new NotSupportedException();

    public Task<int> CountUnreadAsync(Guid recipientUserId, CancellationToken ct = default) =>
        throw new NotSupportedException();

    public Task<Guid?> FindRecipientUserIdAsync(Guid notificationId, CancellationToken ct = default) =>
        throw new NotSupportedException();

    public Task MarkReadAsync(Guid notificationId, CancellationToken ct = default) =>
        throw new NotSupportedException();
}

sealed class TestAppointmentNotificationReader(Func<Guid, AppointmentNotificationContext?> find) : IAppointmentNotificationReader
{
    public List<Guid> Requested { get; } = [];

    public Task<AppointmentNotificationContext?> FindAsync(Guid appointmentId, CancellationToken ct = default)
    {
        Requested.Add(appointmentId);
        return Task.FromResult(find(appointmentId));
    }
}

static class TestNotifiers
{
    public static AppointmentNotifier NoNotifier() => new(
        new TestAppointmentNotificationReader(_ => null),
        new NotificationService(new TestNotificationRepo(() => false)),
        new ShopTimeZone(TimeZoneInfo.Utc));
}

sealed record RecordedRequest(
    HttpMethod Method, Uri Uri, string? Authorization, string? ApiKey, string? ContentType, byte[]? Body);

sealed class RecordingHttpHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
{
    public List<RecordedRequest> Requests { get; } = [];

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var body = request.Content is null ? null : await request.Content.ReadAsByteArrayAsync(cancellationToken);
        var apiKey = request.Headers.TryGetValues("apikey", out var values) ? values.SingleOrDefault() : null;

        Requests.Add(new RecordedRequest(
            request.Method,
            request.RequestUri!,
            request.Headers.Authorization?.ToString(),
            apiKey,
            request.Content?.Headers.ContentType?.MediaType,
            body));

        return respond(request);
    }
}

static class StorageTestKit
{
    public static SupabasePhotoStorage Create(HttpMessageHandler handler) =>
        new(new HttpClient(handler), new StorageOptions
        {
            Url = "https://proj.supabase.co/",
            ServiceKey = "svc-key",
            Bucket = "appointment-photos",
        });

    public static HttpResponseMessage Json(string json) =>
        new(System.Net.HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    public static async Task<bool> ThrowsInvalidOperationAsync(Func<Task> action)
    {
        try
        {
            await action();
            return false;
        }
        catch (InvalidOperationException)
        {
            return true;
        }
    }
}

sealed class TestPhotoStorage : IPhotoStorage
{
    public List<(string Key, string ContentType, byte[] Bytes)> Uploads { get; } = [];
    public List<string> Deleted { get; } = [];
    public List<(IReadOnlyList<string> Keys, TimeSpan Lifetime)> UrlRequests { get; } = [];
    public Func<Task>? OnUpload { get; set; }
    public bool ThrowOnDelete { get; set; }

    public async Task UploadAsync(string storageKey, Stream content, string contentType, CancellationToken ct = default)
    {
        using var copy = new MemoryStream();
        await content.CopyToAsync(copy, ct);
        Uploads.Add((storageKey, contentType, copy.ToArray()));

        if (OnUpload is not null)
            await OnUpload();
    }

    public Task<IReadOnlyList<string>> CreateTemporaryUrlsAsync(
        IReadOnlyList<string> storageKeys, TimeSpan lifetime, CancellationToken ct = default)
    {
        UrlRequests.Add((storageKeys, lifetime));
        return Task.FromResult<IReadOnlyList<string>>(
            storageKeys.Select(key => $"https://files.test/{key}?token=t").ToList());
    }

    public Task DeleteAsync(string storageKey, CancellationToken ct = default)
    {
        Deleted.Add(storageKey);
        return ThrowOnDelete ? throw new InvalidOperationException("delete failed") : Task.CompletedTask;
    }
}

sealed class TestAppointmentPhotoRepo(TestConcurrencyGuard guard) : IAppointmentPhotoRepository
{
    public Guid? SpaStaffId { get; set; }
    public List<AppointmentPhoto> Added { get; } = [];
    public List<AppointmentPhoto> Existing { get; } = [];
    public Exception? AddFailure { get; set; }
    public bool? InsideRunAtAdd { get; private set; }

    public Task<Guid?> FindSpaStaffIdByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        Task.FromResult(SpaStaffId);

    public Task AddAsync(AppointmentPhoto photo, CancellationToken ct = default)
    {
        InsideRunAtAdd = guard.InsideRun;

        if (AddFailure is not null)
            throw AddFailure;

        Added.Add(photo);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<AppointmentPhoto>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<AppointmentPhoto>>(Existing.Where(p => p.AppointmentId == appointmentId).ToList());

    public Dictionary<Guid, Guid> PetByAppointment { get; } = [];
    public int ValidityDays { get; set; } = 7;

    public Task<DateTimeOffset?> FindLatestBeforePhotoUploadedAtByPetAsync(Guid petId, CancellationToken ct = default) =>
        Task.FromResult(Existing
            .Where(p => p.Kind == PhotoKind.Before
                && PetByAppointment.TryGetValue(p.AppointmentId, out var owner) && owner == petId)
            .Select(p => (DateTimeOffset?)p.UploadedAt)
            .OrderByDescending(t => t)
            .FirstOrDefault());

    public Task<bool> HasPhotoAsync(Guid appointmentId, PhotoKind kind, CancellationToken ct = default) =>
        Task.FromResult(Existing.Any(p => p.AppointmentId == appointmentId && p.Kind == kind));

    public Task<int> GetValidityDaysAsync(CancellationToken ct = default) => Task.FromResult(ValidityDays);
}

sealed class PhotoFixture
{
    public static readonly byte[] JpegBytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01];
    public static readonly byte[] PngBytes = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x0D, 0x49, 0x48];
    public static readonly byte[] WebpBytes = [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50];
    public static readonly byte[] GifBytes = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00];

    public TestConcurrencyGuard Guard { get; } = new();
    public TestAppointmentQueryRepo Appointments { get; } = new();
    public TestAppointmentPhotoRepo Photos { get; }
    public TestPhotoStorage Storage { get; } = new();
    public SpaAppointment Spa { get; }
    public Guid OwnerUserId { get; } = Guid.NewGuid();
    public Guid SpaStaffId { get; } = Guid.NewGuid();
    public CurrentUser SpaStaffUser { get; } = new(Guid.NewGuid(), UserRole.Staff);

    public PhotoFixture(AppointmentStatus status)
    {
        Photos = new TestAppointmentPhotoRepo(Guard) { SpaStaffId = SpaStaffId };
        Spa = new SpaAppointment { AppointmentId = Guid.NewGuid(), PetId = Guid.NewGuid(), Status = status };
        Appointments.DetailResult = new AppointmentDetailData(Spa, OwnerUserId, "Milo", [], []);
        Appointments.AssignedResult = true;
    }

    public AppointmentPhotoService CreateService(StaffRole? staffRole = StaffRole.SpaStaff) =>
        new(Appointments, Photos, Storage, Guard, new TestStaffRoleReader(staffRole));

    public AppointmentPhoto AddPhoto(PhotoKind kind, DateTimeOffset uploadedAt, Guid? appointmentId = null, Guid? petId = null)
    {
        var id = Guid.NewGuid();
        var ownerAppointmentId = appointmentId ?? Spa.AppointmentId;
        var photo = new AppointmentPhoto
        {
            PhotoId = id,
            AppointmentId = ownerAppointmentId,
            Kind = kind,
            StorageKey = $"appointments/{ownerAppointmentId}/{kind.ToString().ToLowerInvariant()}-{id}.jpg",
            UploadedByStaffId = SpaStaffId,
            UploadedAt = uploadedAt,
        };

        if (petId is { } explicitPetId)
            Photos.PetByAppointment[ownerAppointmentId] = explicitPetId;
        else
            Photos.PetByAppointment.TryAdd(ownerAppointmentId, ownerAppointmentId == Spa.AppointmentId ? Spa.PetId : Guid.NewGuid());

        Photos.Existing.Add(photo);
        return photo;
    }
}

sealed class TestAppointmentProgressRepo : IAppointmentProgressRepository
{
    public List<PetSpa.Domain.Entities.AppointmentService> Lines { get; } = [];
    public int SaveCalls { get; private set; }

    public Task<PetSpa.Domain.Entities.AppointmentService?> FindServiceLineAsync(
        Guid appointmentId, Guid serviceId, CancellationToken ct = default) =>
        Task.FromResult(Lines.FirstOrDefault(l => l.AppointmentId == appointmentId && l.ServiceId == serviceId));

    public Task<IReadOnlyList<PetSpa.Domain.Entities.AppointmentService>> ListServiceLinesAsync(
        Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<PetSpa.Domain.Entities.AppointmentService>>(
            Lines.Where(l => l.AppointmentId == appointmentId).ToList());

    public Task SaveChangesAsync(CancellationToken ct = default)
    {
        SaveCalls++;
        return Task.CompletedTask;
    }
}

sealed class ProgressFixture
{
    public PhotoFixture Base { get; }
    public TestAssignmentRepo Assignments { get; }
    public TestAppointmentProgressRepo Progress { get; } = new();
    public TestCostConfirmationRepo CostConfirmations { get; } = new();
    public TestPaymentRepo Payments { get; } = new(null);
    public Guid ServiceId { get; } = Guid.NewGuid();
    public CurrentUser ManagerUser { get; } = new(Guid.NewGuid(), UserRole.Manager);
    public SpaAppointment Spa => Base.Spa;
    public PetSpa.Domain.Entities.AppointmentService Line { get; }

    public ProgressFixture(AppointmentStatus status)
    {
        Base = new PhotoFixture(status);
        Assignments = new TestAssignmentRepo(Base.Spa, [], [], new Dictionary<Guid, int>());
        Line = new PetSpa.Domain.Entities.AppointmentService { AppointmentId = Base.Spa.AppointmentId, ServiceId = ServiceId };
        Progress.Lines.Add(Line);
    }

    public AppointmentProgressService CreateService(StaffRole? staffRole = StaffRole.SpaStaff) =>
        new(Base.Appointments, Assignments, Base.Photos, Progress, CostConfirmations, Payments, Base.Guard, new TestStaffRoleReader(staffRole));

    public void MakeReadyToComplete(SizeGroup sizeGroup = SizeGroup.Medium)
    {
        Spa.SizeGroup = sizeGroup;
        Line.IsDone = true;
        Line.DoneAt = DateTimeOffset.UtcNow;
        Base.AddPhoto(PhotoKind.After, DateTimeOffset.UtcNow.AddMinutes(-5));
        Assignments.Added.Add(new AppointmentStaff
        {
            AppointmentId = Spa.AppointmentId,
            StaffId = Guid.NewGuid(),
            IsHolding = true,
        });
        Assignments.AmountInput = new SpaAmountInput(
            Species.Cat,
            [ServiceId],
            [
                new ServicePricing { ServiceId = ServiceId, Species = Species.Cat, SizeGroup = SizeGroup.Small, Price = 100000m },
                new ServicePricing { ServiceId = ServiceId, Species = Species.Cat, SizeGroup = SizeGroup.Medium, Price = 150000m },
            ]);
    }
}
