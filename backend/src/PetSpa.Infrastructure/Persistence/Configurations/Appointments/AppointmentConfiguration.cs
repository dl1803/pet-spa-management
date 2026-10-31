using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> b)
    {
        var spaRequired = "\"SlotStart\" IS NOT NULL AND \"SlotEnd\" IS NOT NULL AND \"BusyUntil\" IS NOT NULL AND \"StaffRequired\" IS NOT NULL";
        var spaNull = "\"SlotStart\" IS NULL AND \"SlotEnd\" IS NULL AND \"BusyUntil\" IS NULL AND \"StaffRequired\" IS NULL";
        var hotelRequired = "\"PlannedCheckIn\" IS NOT NULL AND \"PlannedCheckOut\" IS NOT NULL";
        var hotelNull = "\"PlannedCheckIn\" IS NULL AND \"PlannedCheckOut\" IS NULL AND \"ActualCheckOut\" IS NULL AND \"CageId\" IS NULL";

        b.ToTable("Appointment", t =>
        {
            t.HasCheckConstraint("CK_Appointment_Type", "\"Type\" IN ('Spa', 'Hotel')");
            t.HasCheckConstraint("CK_Appointment_Status", CheckSql.In<AppointmentStatus>("Status"));
            t.HasCheckConstraint("CK_Appointment_CancelReason", CheckSql.In<CancelReason>("CancelReason"));
            t.HasCheckConstraint("CK_Appointment_SizeGroup", CheckSql.In<SizeGroup>("SizeGroup"));
            t.HasCheckConstraint("CK_Appointment_StaffRequired", "\"StaffRequired\" IN (1, 2)");
            t.HasCheckConstraint("CK_Appointment_TypeColumns",
                $"(\"Type\" = 'Spa' AND {spaRequired} AND {hotelNull}) OR (\"Type\" = 'Hotel' AND {hotelRequired} AND {spaNull})");
            t.HasCheckConstraint("CK_Appointment_CancelReasonRequired",
                "(\"Status\" = 'Cancelled' AND \"CancelReason\" IS NOT NULL) OR (\"Status\" <> 'Cancelled' AND \"CancelReason\" IS NULL)");
            t.HasCheckConstraint("CK_Appointment_PlannedNights",
                "\"Type\" <> 'Hotel' OR (\"PlannedCheckOut\" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date > (\"PlannedCheckIn\" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date");
        });
        b.HasKey(a => a.AppointmentId);

        b.HasDiscriminator<string>("Type")
            .HasValue<SpaAppointment>("Spa")
            .HasValue<HotelAppointment>("Hotel");
        b.Property<string>("Type").HasMaxLength(10);

        b.Property(a => a.Status).HasConversion<string>().HasMaxLength(15)
            .HasDefaultValue(AppointmentStatus.Pending);
        b.Property(a => a.CancelReason).HasConversion<string>().HasMaxLength(25);
        b.Property(a => a.SizeGroup).HasConversion<string>().HasMaxLength(10).IsRequired();
        b.Property(a => a.ActualWeightKg).HasPrecision(5, 2);
        b.Property(a => a.CreatedAt).IsRequired();
        b.Property(a => a.UpdatedAt).IsRequired();

        b.HasIndex(a => a.CustomerId);
        b.HasIndex(a => a.PetId);

        b.HasOne<Customer>().WithMany().HasForeignKey(a => a.CustomerId);
        b.HasOne<Pet>().WithMany().HasForeignKey(a => a.PetId);
    }
}
