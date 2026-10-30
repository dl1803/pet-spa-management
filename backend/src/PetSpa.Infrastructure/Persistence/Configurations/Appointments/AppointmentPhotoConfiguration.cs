using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class AppointmentPhotoConfiguration : IEntityTypeConfiguration<AppointmentPhoto>
{
    public void Configure(EntityTypeBuilder<AppointmentPhoto> b)
    {
        b.ToTable("AppointmentPhoto", t =>
            t.HasCheckConstraint("CK_AppointmentPhoto_Kind", CheckSql.In<PhotoKind>("Kind")));
        b.HasKey(p => p.PhotoId);

        b.Property(p => p.Kind).HasConversion<string>().HasMaxLength(10).IsRequired();
        b.Property(p => p.StorageKey).HasMaxLength(300).IsRequired();

        b.HasOne<Appointment>().WithMany().HasForeignKey(p => p.AppointmentId);
        b.HasOne<Staff>().WithMany().HasForeignKey(p => p.UploadedByStaffId);
    }
}

