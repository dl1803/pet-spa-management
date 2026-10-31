using Microsoft.AspNetCore.Authorization;

namespace PetSpa.Api.Security;

// 11 policy theo nhóm người dùng (BR-05), mỗi policy ứng với một tổ hợp có trong ma trận Authorization.md mục 8.
// Tổ hợp cả bốn nhóm = "Đã đăng nhập": dùng [Authorize] không kèm policy.
public static class AuthorizationPolicies
{
    public const string Customer = "Customer";
    public const string Receptionist = "Receptionist";
    public const string SpaStaff = "SpaStaff";
    public const string Manager = "Manager";
    public const string CustomerOrReceptionist = "CustomerOrReceptionist";
    public const string CustomerOrSpaStaff = "CustomerOrSpaStaff";
    public const string CustomerOrManager = "CustomerOrManager";
    public const string ReceptionistOrManager = "ReceptionistOrManager";
    public const string SpaStaffOrManager = "SpaStaffOrManager";
    public const string CustomerOrReceptionistOrManager = "CustomerOrReceptionistOrManager";
    public const string CustomerOrSpaStaffOrManager = "CustomerOrSpaStaffOrManager";

    public static IServiceCollection AddPetSpaAuthorization(this IServiceCollection services)
    {
        var builder = services.AddAuthorizationBuilder()
            // Mặc định từ chối: endpoint không khai báo gì vẫn phải đăng nhập.
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

        Add(builder, Customer, Actor.Customer);
        Add(builder, Receptionist, Actor.Receptionist);
        Add(builder, SpaStaff, Actor.SpaStaff);
        Add(builder, Manager, Actor.Manager);
        Add(builder, CustomerOrReceptionist, Actor.Customer, Actor.Receptionist);
        Add(builder, CustomerOrSpaStaff, Actor.Customer, Actor.SpaStaff);
        Add(builder, CustomerOrManager, Actor.Customer, Actor.Manager);
        Add(builder, ReceptionistOrManager, Actor.Receptionist, Actor.Manager);
        Add(builder, SpaStaffOrManager, Actor.SpaStaff, Actor.Manager);
        Add(builder, CustomerOrReceptionistOrManager, Actor.Customer, Actor.Receptionist, Actor.Manager);
        Add(builder, CustomerOrSpaStaffOrManager, Actor.Customer, Actor.SpaStaff, Actor.Manager);

        services.AddScoped<IAuthorizationHandler, ActorHandler>();
        services.AddSingleton<IAuthorizationMiddlewareResultHandler, ApiAuthorizationResultHandler>();

        return services;
    }

    private static void Add(AuthorizationBuilder builder, string name, params Actor[] allowed) =>
        builder.AddPolicy(name, policy =>
            policy.RequireAuthenticatedUser().AddRequirements(new ActorRequirement(allowed)));
}
