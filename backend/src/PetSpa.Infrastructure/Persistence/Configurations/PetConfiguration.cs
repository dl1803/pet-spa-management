using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class PetConfiguration : IEntityTypeConfiguration<Pet>
{
    public void Configure(EntityTypeBuilder<Pet> b)
    {
        b.ToTable("Pet", t =>
        {
            t.HasCheckConstraint("CK_Pet_Species", CheckSql.In<Species>("Species"));
            t.HasCheckConstraint("CK_Pet_Temperament", CheckSql.In<Temperament>("Temperament"));
            t.HasCheckConstraint("CK_Pet_WeightKg", "\"WeightKg\" > 0");
            t.HasCheckConstraint("CK_Pet_SizeGroup", CheckSql.In<SizeGroup>("SizeGroup"));
        });
        b.HasKey(p => p.PetId);

        b.Property(p => p.Name).HasMaxLength(100).IsRequired();
        b.Property(p => p.Species).HasConversion<string>().HasMaxLength(20).IsRequired();
        b.Property(p => p.Breed).HasMaxLength(100).IsRequired();
        b.Property(p => p.Temperament).HasConversion<string>().HasMaxLength(10)
            .HasDefaultValue(Temperament.Normal).HasSentinel(Temperament.Normal);
        b.Property(p => p.WeightKg).HasPrecision(5, 2);
        b.Property(p => p.HeightCm).HasPrecision(5, 1);
        b.Property(p => p.CoatNote).HasMaxLength(255);
        b.Property(p => p.SizeGroup).HasConversion<string>().HasMaxLength(10).IsRequired();
        b.Property(p => p.IsActive).HasDefaultValue(true).HasSentinel(true);
        b.Property(p => p.CreatedAt).IsRequired();

        b.HasOne<Customer>().WithMany().HasForeignKey(p => p.CustomerId);
    }
}

