using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class SystemConfigConfiguration : IEntityTypeConfiguration<SystemConfig>
{
    public void Configure(EntityTypeBuilder<SystemConfig> b)
    {
        b.ToTable("SystemConfig");
        b.HasKey(c => c.ConfigKey);

        b.Property(c => c.ConfigKey).HasMaxLength(100);
        b.Property(c => c.ConfigValue).HasMaxLength(200).IsRequired();
        b.Property(c => c.Description).HasMaxLength(255);
    }
}

