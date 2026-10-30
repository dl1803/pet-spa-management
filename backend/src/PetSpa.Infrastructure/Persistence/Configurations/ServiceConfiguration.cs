using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class ServiceConfiguration : IEntityTypeConfiguration<Service>
{
    public void Configure(EntityTypeBuilder<Service> b)
    {
        b.ToTable("Service");
        b.HasKey(s => s.ServiceId);

        b.Property(s => s.Name).HasMaxLength(150).IsRequired();
        b.Property(s => s.IsActive).HasDefaultValue(true).HasSentinel(true);
    }
}

