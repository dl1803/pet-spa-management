using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace PetSpa.Api.Filters;

/// <summary>
/// Chỉ gắn yêu cầu Bearer token trên Swagger cho các endpoint có [Authorize] và không có [AllowAnonymous].
/// </summary>
public sealed class AuthorizeOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var metadata = context.ApiDescription.ActionDescriptor.EndpointMetadata;
        var hasAllowAnonymous = metadata.OfType<IAllowAnonymous>().Any();
        var hasAuthorize = metadata.OfType<IAuthorizeData>().Any();

        if (hasAllowAnonymous || !hasAuthorize)
        {
            return;
        }

        operation.Security ??= [];
        operation.Security.Add(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    }
}
