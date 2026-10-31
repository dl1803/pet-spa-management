using Microsoft.AspNetCore.Authorization;
using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Security;

// Bốn nhóm người dùng (Authorization.md mục 1): KH, LT, NVS, QL.
public enum Actor
{
    Customer,
    Receptionist,
    SpaStaff,
    Manager,
}

// Yêu cầu: người gọi thuộc một trong các nhóm được phép.
public sealed class ActorRequirement : IAuthorizationRequirement
{
    public ActorRequirement(params Actor[] allowed) => Allowed = new HashSet<Actor>(allowed);

    public HashSet<Actor> Allowed { get; }
}

// Customer, Manager nhận diện bằng Role trong token.
// Staff phải tra StaffRole trong dữ liệu Staff (không có trong token); không có hồ sơ Staff -> từ chối.
public sealed class ActorHandler(IStaffRoleReader staffRoles) : AuthorizationHandler<ActorRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, ActorRequirement requirement)
    {
        if (context.User.Identity?.IsAuthenticated != true) return;

        var current = context.User.ToCurrentUser();

        Actor? actor = null;
        if (current.Role == UserRole.Customer) actor = Actor.Customer;
        else if (current.Role == UserRole.Manager) actor = Actor.Manager;
        else if (requirement.Allowed.Contains(Actor.Receptionist) || requirement.Allowed.Contains(Actor.SpaStaff))
            actor = await GetStaffActorAsync(current.UserId);

        if (actor is not null && requirement.Allowed.Contains(actor.Value))
            context.Succeed(requirement);
    }

    private async Task<Actor?> GetStaffActorAsync(Guid userId)
    {
        var staffRole = await staffRoles.GetStaffRoleAsync(userId);
        if (staffRole == StaffRole.Receptionist) return Actor.Receptionist;
        if (staffRole == StaffRole.SpaStaff) return Actor.SpaStaff;
        return null;
    }
}
