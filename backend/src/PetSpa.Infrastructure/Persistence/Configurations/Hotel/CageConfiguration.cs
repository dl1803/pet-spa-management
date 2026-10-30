using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class CageConfiguration : IEntityTypeConfiguration<Cage>
{
    public void Configure(EntityTypeBuilder<Cage> b)
    {
        b.ToTable("Cage", t =>
        {
            t.HasCheckConstraint("CK_Cage_Species", CheckSql.In<Species>("Species"));
            t.HasCheckConstraint("CK_Cage_SizeGroup", CheckSql.In<SizeGroup>("SizeGroup"));
        });
        b.HasKey(c => c.CageId);

        b.Property(c => c.Code).HasMaxLength(20).IsRequired();
        b.Property(c => c.Species).HasConversion<string>().HasMaxLength(20).IsRequired();
        b.Property(c => c.SizeGroup).HasConversion<string>().HasMaxLength(10).IsRequired();
        b.Property(c => c.IsActive).HasDefaultValue(true).HasSentinel(true);

        b.HasIndex(c => c.Code).IsUnique();
    }
}

