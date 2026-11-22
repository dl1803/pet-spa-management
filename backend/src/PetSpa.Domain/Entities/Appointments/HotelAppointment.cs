using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.StateMachine;

namespace PetSpa.Domain.Entities;

public class HotelAppointment : Appointment
{
    public DateTimeOffset PlannedCheckIn { get; set; }
    public DateTimeOffset PlannedCheckOut { get; set; }
    public DateTimeOffset? ActualCheckOut { get; set; }
    public Guid? CageId { get; set; }

    protected override AppointmentLifecycle GetLifecycle() => AppointmentLifecycle.Hotel;

    public override DateTimeOffset GetScheduledStart() => PlannedCheckIn;

    public void Reschedule(Guid petId, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut)
    {
        BeginCustomerChange();

        PetId = petId;
        SizeGroup = sizeGroup;
        PlannedCheckIn = checkIn;
        PlannedCheckOut = checkOut;
    }

    public void RescheduleByManager(Guid petId, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut)
    {
        BeginManagerChange();

        PetId = petId;
        SizeGroup = sizeGroup;
        PlannedCheckIn = checkIn;
        PlannedCheckOut = checkOut;
    }

    public void ReassignCage(Cage cage, Species petSpecies)
    {
        ArgumentNullException.ThrowIfNull(cage);

        if (Status != AppointmentStatus.Confirmed)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        if (!cage.IsActive || cage.Species != petSpecies || cage.SizeGroup != SizeGroup)
            throw new BusinessException(ErrorCodes.CageConflict);

        CageId = cage.CageId;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public override void ReturnToPending()
    {
        base.ReturnToPending();
        CageId = null;
    }

    public void AssignCage(Cage cage, Species petSpecies)
    {
        ArgumentNullException.ThrowIfNull(cage);

        GetLifecycle().EnsureTransition(Status, AppointmentStatus.Confirmed);

        if (!cage.IsActive || cage.Species != petSpecies || cage.SizeGroup != SizeGroup)
            throw new BusinessException(ErrorCodes.CageConflict);

        CageId = cage.CageId;
        Confirm();
    }

    public bool IsCageSuitable(Cage? cage, Species petSpecies) =>
        cage is not null
        && CageId == cage.CageId
        && cage.IsActive
        && cage.Species == petSpecies
        && cage.SizeGroup == SizeGroup;

    public void CheckIn() => MoveTo(AppointmentStatus.InStay);

    public void CheckOut() => CheckOut(null);

    public void CheckOut(DateTimeOffset? actualCheckOut)
    {
        MoveTo(AppointmentStatus.Completed);
        ActualCheckOut = actualCheckOut ?? DateTimeOffset.UtcNow;
    }
}
