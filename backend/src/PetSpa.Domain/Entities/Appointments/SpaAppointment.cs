using PetSpa.Domain.Enums;
using PetSpa.Domain.StateMachine;

namespace PetSpa.Domain.Entities;

public class SpaAppointment : Appointment
{
    public DateTimeOffset SlotStart { get; set; }
    public DateTimeOffset SlotEnd { get; set; }
    public DateTimeOffset BusyUntil { get; set; }
    public short StaffRequired { get; set; }

    protected override AppointmentLifecycle GetLifecycle() => AppointmentLifecycle.Spa;

    public void Receive() => MoveTo(AppointmentStatus.Received);

    public void Start() => MoveTo(AppointmentStatus.InProgress);

    public void Complete() => MoveTo(AppointmentStatus.Completed);
}
