using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Infrastructure.Identity;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> b)
    {
        b.ToTable("RefreshToken");
        b.HasKey(t => t.TokenId);

        b.Property(t => t.TokenHash).IsRequired();
        b.Property(t => t.ExpiresAt).IsRequired();
        b.Property(t => t.CreatedAt).IsRequired();

        b.HasIndex(t => t.TokenHash).IsUnique();
        b.HasIndex(t => t.UserId);

        b.HasOne<AppUser>().WithMany().HasForeignKey(t => t.UserId);
    }
}

