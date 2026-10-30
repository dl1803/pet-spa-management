namespace PetSpa.Domain.Entities;

public class HotelAppointment : Appointment
{
    public DateTimeOffset PlannedCheckIn { get; set; }
    public DateTimeOffset PlannedCheckOut { get; set; }
    public DateTimeOffset? ActualCheckOut { get; set; }
    public Guid? CageId { get; set; }
}

