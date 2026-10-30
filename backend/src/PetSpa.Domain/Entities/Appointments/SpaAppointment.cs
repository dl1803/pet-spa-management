namespace PetSpa.Domain.Entities;

public class SpaAppointment : Appointment
{
    public DateTimeOffset SlotStart { get; set; }
    public DateTimeOffset SlotEnd { get; set; }
    public DateTimeOffset BusyUntil { get; set; }
    public short StaffRequired { get; set; }
}

