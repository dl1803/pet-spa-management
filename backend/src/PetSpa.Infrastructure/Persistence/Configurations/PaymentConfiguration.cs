using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Infrastructure.Identity;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> b)
    {
        b.ToTable("Payment", t =>
        {
            t.HasCheckConstraint("CK_Payment_Kind", CheckSql.In<PaymentKind>("Kind"));
            t.HasCheckConstraint("CK_Payment_Amount", "\"Amount\" >= 0");
            t.HasCheckConstraint("CK_Payment_Status", CheckSql.In<PaymentStatus>("Status"));
            t.HasCheckConstraint("CK_Payment_Method", CheckSql.In<PaymentMethod>("Method"));
        });
        b.HasKey(p => p.PaymentId);

        b.Property(p => p.Kind).HasConversion<string>().HasMaxLength(10).IsRequired();
        b.Property(p => p.Amount).HasPrecision(12, 0);
        b.Property(p => p.Status).HasConversion<string>().HasMaxLength(10)
            .HasDefaultValue(PaymentStatus.Unpaid);
        b.Property(p => p.Method).HasConversion<string>().HasMaxLength(10);
        b.Property(p => p.ReceivedAmount).HasPrecision(12, 0);

        b.HasIndex(p => new { p.AppointmentId, p.Kind }).IsUnique();

        b.HasOne<Appointment>().WithMany().HasForeignKey(p => p.AppointmentId);
        b.HasOne<AppUser>().WithMany().HasForeignKey(p => p.ConfirmedByUserId);
    }
}

