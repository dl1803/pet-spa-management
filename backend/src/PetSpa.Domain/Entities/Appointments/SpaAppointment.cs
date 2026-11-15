using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.StateMachine;

namespace PetSpa.Domain.Entities;

public class SpaAppointment : Appointment
{
    public DateTimeOffset SlotStart { get; set; }
    public DateTimeOffset SlotEnd { get; set; }
    public DateTimeOffset BusyUntil { get; set; }
    public short StaffRequired { get; set; }

    protected override AppointmentLifecycle GetLifecycle() => AppointmentLifecycle.Spa;

    public IReadOnlyList<AppointmentStaff> AssignStaff(IReadOnlyCollection<Guid> staffIds)
    {
        GetLifecycle().EnsureTransition(Status, AppointmentStatus.Confirmed);

        var distinctIds = staffIds.Distinct().ToList();
        if (distinctIds.Count != StaffRequired)
            throw new BusinessException(ErrorCodes.StaffCountMismatch);

        var assignedAt = DateTimeOffset.UtcNow;

        return distinctIds
            .Select(staffId => new AppointmentStaff
            {
                AppointmentId = AppointmentId,
                StaffId = staffId,
                BusyFrom = SlotStart,
                BusyUntil = BusyUntil,
                IsHolding = true,
                AssignedAt = assignedAt,
            })
            .ToList();
    }

    public void Receive() => MoveTo(AppointmentStatus.Received);

    public void Start() => MoveTo(AppointmentStatus.InProgress);

    public void Complete() => MoveTo(AppointmentStatus.Completed);
}
