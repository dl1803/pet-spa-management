namespace PetSpa.Domain.Entities;

public class AppointmentService
{
    public Guid AppointmentId { get; set; }
    public Guid ServiceId { get; set; }
    public bool IsDone { get; set; }
    public DateTimeOffset? DoneAt { get; set; }
    public string? Note { get; set; }
}

