namespace PetSpa.Domain.Entities;

public class WorkShift
{
    public Guid ShiftId { get; set; }
    public Guid StaffId { get; set; }
    public DateTimeOffset ShiftStart { get; set; }
    public DateTimeOffset ShiftEnd { get; set; }
}

