using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Enums;
using PetSpa.Infrastructure.Identity;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> b)
    {
        var roles = string.Join(", ", Enum.GetNames<UserRole>().Select(r => $"'{r}'"));

        b.ToTable("AppUser", t =>
            t.HasCheckConstraint("CK_AppUser_Role", $"\"Role\" IN ({roles})"));

        b.Property(u => u.Id).HasColumnName("UserId");
        b.Property(u => u.UserName).HasMaxLength(20).IsRequired();
        b.Property(u => u.Role).HasConversion<string>().HasMaxLength(20).IsRequired();
        // HasSentinel: để IsActive = false khi tạo mới vẫn được lưu là false
        b.Property(u => u.IsActive).HasDefaultValue(true).HasSentinel(true);
        b.Property(u => u.CreatedAt).IsRequired();
    }
}

