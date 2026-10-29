using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Infrastructure.Identity;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class CostConfirmationConfiguration : IEntityTypeConfiguration<CostConfirmation>
{
    public void Configure(EntityTypeBuilder<CostConfirmation> b)
    {
        b.ToTable("CostConfirmation", t =>
        {
            t.HasCheckConstraint("CK_CostConfirmation_NewSizeGroup", CheckSql.In<SizeGroup>("NewSizeGroup"));
            t.HasCheckConstraint("CK_CostConfirmation_Status", CheckSql.In<ConfirmationStatus>("Status"));
        });
        b.HasKey(c => c.ConfirmationId);

        b.Property(c => c.ActualWeightKg).HasPrecision(5, 2);
        b.Property(c => c.NewSizeGroup).HasConversion<string>().HasMaxLength(10).IsRequired();
        b.Property(c => c.OldAmount).HasPrecision(12, 0);
        b.Property(c => c.NewAmount).HasPrecision(12, 0);
        b.Property(c => c.Status).HasConversion<string>().HasMaxLength(10).IsRequired();
        b.Property(c => c.CreatedAt).IsRequired();

        b.HasIndex(c => c.AppointmentId)
            .IsUnique()
            .HasFilter("\"Status\" = 'Pending'")
            .HasDatabaseName("UX_CostConfirmation_AppointmentId_Pending");

        b.HasOne<Appointment>().WithMany().HasForeignKey(c => c.AppointmentId);
        b.HasOne<AppUser>().WithMany().HasForeignKey(c => c.RespondedByUserId);
    }
}

