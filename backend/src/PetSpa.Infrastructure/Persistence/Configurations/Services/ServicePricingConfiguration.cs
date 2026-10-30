using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class ServicePricingConfiguration : IEntityTypeConfiguration<ServicePricing>
{
    public void Configure(EntityTypeBuilder<ServicePricing> b)
    {
        b.ToTable("ServicePricing", t =>
        {
            t.HasCheckConstraint("CK_ServicePricing_Species", CheckSql.In<Species>("Species"));
            t.HasCheckConstraint("CK_ServicePricing_SizeGroup", CheckSql.In<SizeGroup>("SizeGroup"));
            t.HasCheckConstraint("CK_ServicePricing_Price", "\"Price\" >= 0");
            t.HasCheckConstraint("CK_ServicePricing_DurationMinutes", "\"DurationMinutes\" > 0");
            t.HasCheckConstraint("CK_ServicePricing_StaffRequired", "\"StaffRequired\" IN (1, 2)");
        });
        b.HasKey(p => new { p.ServiceId, p.Species, p.SizeGroup });

        b.Property(p => p.Species).HasConversion<string>().HasMaxLength(20);
        b.Property(p => p.SizeGroup).HasConversion<string>().HasMaxLength(10);
        b.Property(p => p.Price).HasPrecision(12, 0);
        b.Property(p => p.StaffRequired).HasDefaultValue((short)1);

        b.HasOne<Service>().WithMany().HasForeignKey(p => p.ServiceId);
    }
}

