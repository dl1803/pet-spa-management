using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Infrastructure.Identity;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class StaffConfiguration : IEntityTypeConfiguration<Staff>
{
    public void Configure(EntityTypeBuilder<Staff> b)
    {
        b.ToTable("Staff", t =>
            t.HasCheckConstraint("CK_Staff_StaffRole", CheckSql.In<StaffRole>("StaffRole")));
        b.HasKey(s => s.StaffId);

        b.Property(s => s.FullName).HasMaxLength(150).IsRequired();
        b.Property(s => s.StaffRole).HasConversion<string>().HasMaxLength(20).IsRequired();

        b.HasIndex(s => s.UserId).IsUnique();

        b.HasOne<AppUser>().WithOne().HasForeignKey<Staff>(s => s.UserId);
    }
}

