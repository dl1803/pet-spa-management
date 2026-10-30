using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class WorkShiftConfiguration : IEntityTypeConfiguration<WorkShift>
{
    public void Configure(EntityTypeBuilder<WorkShift> b)
    {
        b.ToTable("WorkShift", t =>
            t.HasCheckConstraint("CK_WorkShift_ShiftEnd", "\"ShiftEnd\" > \"ShiftStart\""));
        b.HasKey(w => w.ShiftId);

        b.HasOne<Staff>().WithMany().HasForeignKey(w => w.StaffId);
    }
}

