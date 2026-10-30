using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class AppointmentServiceConfiguration : IEntityTypeConfiguration<AppointmentService>
{
    public void Configure(EntityTypeBuilder<AppointmentService> b)
    {
        b.ToTable("AppointmentService");
        b.HasKey(s => new { s.AppointmentId, s.ServiceId });

        b.Property(s => s.IsDone).HasDefaultValue(false);

        b.HasOne<Appointment>().WithMany().HasForeignKey(s => s.AppointmentId);
        b.HasOne<Service>().WithMany().HasForeignKey(s => s.ServiceId);
    }
}

