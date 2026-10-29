using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class HotelPricingConfiguration : IEntityTypeConfiguration<HotelPricing>
{
    public void Configure(EntityTypeBuilder<HotelPricing> b)
    {
        b.ToTable("HotelPricing", t =>
        {
            t.HasCheckConstraint("CK_HotelPricing_Species", CheckSql.In<Species>("Species"));
            t.HasCheckConstraint("CK_HotelPricing_SizeGroup", CheckSql.In<SizeGroup>("SizeGroup"));
            t.HasCheckConstraint("CK_HotelPricing_PricePerNight", "\"PricePerNight\" >= 0");
            t.HasCheckConstraint("CK_HotelPricing_FoodPerNight", "\"FoodPerNight\" >= 0");
        });
        b.HasKey(p => new { p.Species, p.SizeGroup });

        b.Property(p => p.Species).HasConversion<string>().HasMaxLength(20);
        b.Property(p => p.SizeGroup).HasConversion<string>().HasMaxLength(10);
        b.Property(p => p.PricePerNight).HasPrecision(12, 0);
        b.Property(p => p.FoodPerNight).HasPrecision(12, 0);
    }
}

