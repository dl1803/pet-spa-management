using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class SpaAppointmentConfiguration : IEntityTypeConfiguration<SpaAppointment>
{
    public void Configure(EntityTypeBuilder<SpaAppointment> b)
    {
        b.HasIndex(a => new { a.Status, a.SlotStart });
    }
}

