using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class AppointmentStaffConfiguration : IEntityTypeConfiguration<AppointmentStaff>
{
    public void Configure(EntityTypeBuilder<AppointmentStaff> b)
    {
        b.ToTable("AppointmentStaff", t =>
            t.HasCheckConstraint("CK_AppointmentStaff_BusyRange", "\"BusyUntil\" > \"BusyFrom\""));
        b.HasKey(s => new { s.AppointmentId, s.StaffId });

        b.Property(s => s.IsHolding).HasDefaultValue(true).HasSentinel(true);

        b.HasIndex(s => s.StaffId);

        b.HasOne<Appointment>().WithMany().HasForeignKey(s => s.AppointmentId);
        b.HasOne<Staff>().WithMany().HasForeignKey(s => s.StaffId);
    }
}
