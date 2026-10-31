using System.Reflection;
using FluentValidation;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.OpenApi.Models;
using PetSpa.Api.Filters;
using PetSpa.Api.Middleware;
using PetSpa.Api.Security;
using PetSpa.Domain.Exceptions;
using PetSpa.Infrastructure;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .WriteTo.Console());

builder.Services.AddControllers(options =>
    {
        options.Filters.Add<ValidationFilter>();
        // Để FluentValidation là nơi duy nhất kiểm tra trường bắt buộc.
        options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        // Body sai định dạng JSON hoặc sai kiểu dữ liệu: trả cùng error envelope VALIDATION_ERROR qua middleware.
        options.InvalidModelStateResponseFactory = _ =>
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu gửi lên không hợp lệ hoặc sai định dạng.");
    });

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddPetSpaAuthorization();
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Select(o => o.TrimEnd('/'))
    .ToArray();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()));
builder.Services.AddValidatorsFromAssemblyContaining<ValidationFilter>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddPetSpaRateLimiting(builder.Configuration);
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Pet Spa Management API",
        Version = "v1",
        Description = "Backend phục vụ Web Khách hàng, Web Nhân viên và Web Quản lý."
    });

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFile));
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/swagger/v1/swagger.json", "Pet Spa API v1"));
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();

app.Run();
