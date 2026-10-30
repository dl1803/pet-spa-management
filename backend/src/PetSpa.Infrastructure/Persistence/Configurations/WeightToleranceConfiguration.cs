using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class WeightToleranceConfiguration : IEntityTypeConfiguration<WeightTolerance>
{
    public void Configure(EntityTypeBuilder<WeightTolerance> b)
    {
        b.ToTable("WeightTolerance", t =>
        {
            t.HasCheckConstraint("CK_WeightTolerance_Species", CheckSql.In<Species>("Species"));
            t.HasCheckConstraint("CK_WeightTolerance_FromGroup", CheckSql.In<SizeGroup>("FromGroup"));
            t.HasCheckConstraint("CK_WeightTolerance_ToGroup", CheckSql.In<SizeGroup>("ToGroup"));
        });
        b.HasKey(w => new { w.Species, w.FromGroup, w.ToGroup });

        b.Property(w => w.Species).HasConversion<string>().HasMaxLength(20);
        b.Property(w => w.FromGroup).HasConversion<string>().HasMaxLength(10);
        b.Property(w => w.ToGroup).HasConversion<string>().HasMaxLength(10);
        b.Property(w => w.ToleranceKg).HasPrecision(4, 2);
    }
}

