using Microsoft.AspNetCore.Identity;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Identity;

public class AppUser : IdentityUser<Guid>
{
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

