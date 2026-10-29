using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Infrastructure.Identity;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> b)
    {
        b.ToTable("Notification", t =>
            t.HasCheckConstraint("CK_Notification_Type", CheckSql.In<NotificationType>("Type")));
        b.HasKey(n => n.NotificationId);

        b.Property(n => n.Type).HasConversion<string>().HasMaxLength(20).IsRequired();
        b.Property(n => n.Message).HasMaxLength(500).IsRequired();
        b.Property(n => n.IsRead).HasDefaultValue(false);
        b.Property(n => n.CreatedAt).IsRequired();

        b.HasOne<AppUser>().WithMany().HasForeignKey(n => n.RecipientUserId);
        b.HasOne<Appointment>().WithMany().HasForeignKey(n => n.AppointmentId);
    }
}

