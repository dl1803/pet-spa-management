using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class HotelAppointmentConfiguration : IEntityTypeConfiguration<HotelAppointment>
{
    public void Configure(EntityTypeBuilder<HotelAppointment> b)
    {
        b.HasOne<Cage>().WithMany().HasForeignKey(a => a.CageId);
    }
}

