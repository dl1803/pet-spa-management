using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class SizeRuleConfiguration : IEntityTypeConfiguration<SizeRule>
{
    public void Configure(EntityTypeBuilder<SizeRule> b)
    {
        b.ToTable("SizeRule", t =>
        {
            t.HasCheckConstraint("CK_SizeRule_Species", CheckSql.In<Species>("Species"));
            t.HasCheckConstraint("CK_SizeRule_Criterion", CheckSql.In<SizeCriterion>("Criterion"));
        });
        b.HasKey(r => new { r.Species, r.Criterion });

        b.Property(r => r.Species).HasConversion<string>().HasMaxLength(20);
        b.Property(r => r.Criterion).HasConversion<string>().HasMaxLength(10);
        b.Property(r => r.SmallUpper).HasPrecision(5, 1);
        b.Property(r => r.MediumUpper).HasPrecision(5, 1);
    }
}

