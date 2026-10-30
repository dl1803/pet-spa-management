namespace PetSpa.Domain.Entities;

public class AppointmentStaff
{
    public Guid AppointmentId { get; set; }
    public Guid StaffId { get; set; }
    public DateTimeOffset BusyFrom { get; set; }
    public DateTimeOffset BusyUntil { get; set; }
    public bool IsHolding { get; set; } = true;
    public DateTimeOffset AssignedAt { get; set; }
}

