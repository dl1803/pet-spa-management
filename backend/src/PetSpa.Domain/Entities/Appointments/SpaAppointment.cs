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
