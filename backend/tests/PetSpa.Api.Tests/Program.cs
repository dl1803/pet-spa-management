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
using PetSpa.Application.Services.Assignment;
using PetSpa.Application.Services;
using PetSpa.Application.Services.Booking;
using PetSpa.Application.Services.Payments;
using PetSpa.Domain.Enums;
using PetSpa.Infrastructure.Identity;
using PetSpa.Infrastructure.Payments.Vnpay;
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

        Check(threw, "Staff must be rejected with Forbidden.");
        Check(repo.ListAllCalls == 1 && repo.ListByCustomerCalls == 1,
            "Rejected staff must not reach any repository query.");
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
            new TestConcurrencyGuard());

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
            new TestConcurrencyGuard());
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
        var service = new AssignmentService(repo, new TestScheduleRepo(15, false, shifts, []), guard);

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
        var serviceReassign = new AssignmentService(repoReassign, new TestScheduleRepo(15, false, shiftsWithCuong, []), guard);

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
            return (new AssignmentService(repo, new TestScheduleRepo(15, false, shifts, []), new TestConcurrencyGuard()), repo);
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
            guard);

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
        var service = new AssignmentService(repo, new TestScheduleRepo(15, false, [], []), guard);

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

            return (new AssignmentService(repo, new TestScheduleRepo(15, false, [], []), new TestConcurrencyGuard()), repo);
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
        var service = new AssignmentService(repo, new TestScheduleRepo(15, false, shifts, []), guard);

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
        var service = new AssignmentService(repo, new TestScheduleRepo(15, false, outOfShift, []), guard);
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
        var service = new AssignmentService(repo, new TestScheduleRepo(15, false, [], []), guard);

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

            return (new AssignmentService(repo, new TestScheduleRepo(15, false, [], []), new TestConcurrencyGuard()), repo);
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
            new TestConcurrencyGuard());
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
            new TestConcurrencyGuard());

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
            new TestConcurrencyGuard());

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
            guard);

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
            new TestConcurrencyGuard());

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
            new TestConcurrencyGuard());
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
            new TestConcurrencyGuard());

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
        new ShopTimeZone(TimeZoneInfo.Utc));

    return (bookingService, schedule, new CurrentUser(ownerUserId, UserRole.Customer), petId, serviceId, slotStart);
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
    public Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default)
    {
        RunCalls++;
        Events.Add("run");
        return work();
    }
    public Task RunAsync(Func<Task> work, CancellationToken ct = default)
    {
        RunCalls++;
        Events.Add("run");
        return work();
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

sealed class TestAppointmentQueryRepo : IAppointmentQueryRepository
{
    public int ListAllCalls { get; private set; }
    public int ListByCustomerCalls { get; private set; }
    public Guid? LastListAllPetId { get; private set; }

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

    public Task<AppointmentDetailData?> FindDetailAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult<AppointmentDetailData?>(null);
}

sealed class TestAssignmentRepo(
    SpaAppointment? appointment,
    IReadOnlyList<SpaStaffCandidate> staff,
    IReadOnlyList<StaffBusyWindow> busy,
    IReadOnlyDictionary<Guid, int> recentCounts) : IAssignmentRepository
{
    public Guid? LastExcludeAppointmentId { get; private set; }

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
        Task.FromResult(appointment is not null && appointment.AppointmentId == appointmentId ? appointment : null);

    public Task<int> GetSuggestLookbackDaysAsync(CancellationToken ct = default) => Task.FromResult(30);

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

sealed class TestPaymentRepo(PaymentWithOwner? found, PaymentCallbackTarget? callbackTarget = null) : IPaymentRepository
{
    public List<PaymentTransaction> Added { get; } = [];
    public List<string> Events { get; init; } = [];
    public int SaveCalls { get; private set; }
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
