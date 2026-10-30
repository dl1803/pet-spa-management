using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Infrastructure.Identity;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> b)
    {
        b.ToTable("Customer");
        b.HasKey(c => c.CustomerId);

        b.Property(c => c.FullName).HasMaxLength(150).IsRequired();
        b.Property(c => c.Phone).HasMaxLength(20).IsRequired();
        b.Property(c => c.Email).HasMaxLength(150);
        b.Property(c => c.IsBookingLocked).HasDefaultValue(false);
        b.Property(c => c.CreatedAt).IsRequired();

        b.HasIndex(c => c.Phone).IsUnique();
        b.HasIndex(c => c.UserId).IsUnique();

        b.HasOne<AppUser>().WithOne().HasForeignKey<Customer>(c => c.UserId);
    }
}

