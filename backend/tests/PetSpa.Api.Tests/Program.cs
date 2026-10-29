using System.Text.Json;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using PetSpa.Api.Filters;
using PetSpa.Api.Middleware;
using PetSpa.Domain.Exceptions;

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
