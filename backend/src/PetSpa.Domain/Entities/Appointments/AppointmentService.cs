namespace PetSpa.Domain.Entities;

public class AppointmentService
{
    public Guid AppointmentId { get; set; }
    public Guid ServiceId { get; set; }
    public bool IsDone { get; set; }
    public DateTimeOffset? DoneAt { get; set; }
    public string? Note { get; set; }

    public void SetProgress(bool isDone, string? note, DateTimeOffset now)
    {
        if (!isDone) DoneAt = null;
        else if (!IsDone) DoneAt = now;

        IsDone = isDone;

        if (note is not null)
        {
            var trimmed = note.Trim();
            Note = trimmed.Length == 0 ? null : trimmed;
        }
    }
}
