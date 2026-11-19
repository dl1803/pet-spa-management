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

    public override DateTimeOffset GetScheduledStart() => SlotStart;

    public void Reschedule(
        Guid petId,
        SizeGroup sizeGroup,
        DateTimeOffset slotStart,
        DateTimeOffset slotEnd,
        DateTimeOffset busyUntil,
        short staffRequired)
    {
        BeginCustomerChange();

        PetId = petId;
        SizeGroup = sizeGroup;
        SlotStart = slotStart;
        SlotEnd = slotEnd;
        BusyUntil = busyUntil;
        StaffRequired = staffRequired;
    }

    public void RescheduleByManager(
        Guid petId,
        SizeGroup sizeGroup,
        DateTimeOffset slotStart,
        DateTimeOffset slotEnd,
        DateTimeOffset busyUntil,
        short staffRequired)
    {
        BeginManagerChange();

        PetId = petId;
        SizeGroup = sizeGroup;
        SlotStart = slotStart;
        SlotEnd = slotEnd;
        BusyUntil = busyUntil;
        StaffRequired = staffRequired;
    }

    public IReadOnlyList<AppointmentStaff> ReassignStaff(IReadOnlyCollection<Guid> staffIds)
    {
        if (Status != AppointmentStatus.Confirmed)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        var distinctIds = staffIds.Distinct().ToList();
        if (distinctIds.Count != StaffRequired)
            throw new BusinessException(ErrorCodes.StaffCountMismatch);

        var now = DateTimeOffset.UtcNow;
        UpdatedAt = now;

        return distinctIds
            .Select(staffId => new AppointmentStaff
            {
                AppointmentId = AppointmentId,
                StaffId = staffId,
                BusyFrom = SlotStart,
                BusyUntil = BusyUntil,
                IsHolding = true,
                AssignedAt = now,
            })
            .ToList();
    }

    public IReadOnlyList<AppointmentStaff> AssignStaff(IReadOnlyCollection<Guid>? staffIds)
    {
        if (staffIds is null || staffIds.Count == 0)
            throw new BusinessException(ErrorCodes.ValidationError, "Danh sách nhân viên phân công không được để trống.");

        GetLifecycle().EnsureTransition(Status, AppointmentStatus.Confirmed);

        var distinctIds = staffIds.Distinct().ToList();
        if (distinctIds.Count != StaffRequired)
            throw new BusinessException(ErrorCodes.StaffCountMismatch);

        var now = DateTimeOffset.UtcNow;
        UpdatedAt = now;

        return distinctIds
            .Select(staffId => new AppointmentStaff
            {
                AppointmentId = AppointmentId,
                StaffId = staffId,
                BusyFrom = SlotStart,
                BusyUntil = BusyUntil,
                IsHolding = true,
                AssignedAt = now,
            })
            .ToList();
    }

    public void ConfirmWithAssignedStaff(int assignedStaffCount)
    {
        GetLifecycle().EnsureTransition(Status, AppointmentStatus.Confirmed);

        if (assignedStaffCount != StaffRequired)
            throw new BusinessException(ErrorCodes.StaffCountMismatch);

        Confirm();
    }

    public void Receive() => MoveTo(AppointmentStatus.Received);

    public void Start() => MoveTo(AppointmentStatus.InProgress);

    public void Complete() => MoveTo(AppointmentStatus.Completed);
}
