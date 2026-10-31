using PetSpa.Domain.Enums;
using PetSpa.Domain.StateMachine;

namespace PetSpa.Domain.Entities;

public class HotelAppointment : Appointment
{
    public DateTimeOffset PlannedCheckIn { get; set; }
    public DateTimeOffset PlannedCheckOut { get; set; }
    public DateTimeOffset? ActualCheckOut { get; set; }
    public Guid? CageId { get; set; }

    protected override AppointmentLifecycle GetLifecycle() => AppointmentLifecycle.Hotel;

    public override void ReturnToPending()
    {
        base.ReturnToPending();
        CageId = null;
    }

    public void CheckIn() => MoveTo(AppointmentStatus.InStay);

    public void CheckOut() => MoveTo(AppointmentStatus.Completed);
}
