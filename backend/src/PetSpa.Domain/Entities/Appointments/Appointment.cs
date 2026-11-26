using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.StateMachine;

namespace PetSpa.Domain.Entities;

public abstract class Appointment
{
    public Guid AppointmentId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid PetId { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;
    public CancelReason? CancelReason { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public SizeGroup SizeGroup { get; set; }
    public decimal? ActualWeightKg { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    protected abstract AppointmentLifecycle GetLifecycle();

    public bool CanTransitionTo(AppointmentStatus next, CancelReason? reason = null) =>
        GetLifecycle().CanTransition(Status, next, reason);

    public bool CanCancel() => GetLifecycle().CanCancel(Status);

    public bool CanCancelWith(CancelReason reason) => GetLifecycle().CanCancel(Status, reason);

    public abstract DateTimeOffset GetScheduledStart();

    public void EnsureChangeableByCustomer()
    {
        if (Status is not (AppointmentStatus.Pending or AppointmentStatus.Confirmed))
            throw new BusinessException(ErrorCodes.InvalidTransition);
    }

    public void EnsureChangeableByManager()
    {
        if (Status is not (AppointmentStatus.Pending or AppointmentStatus.Confirmed))
            throw new BusinessException(ErrorCodes.InvalidTransition);
    }

    public void Confirm() => MoveTo(AppointmentStatus.Confirmed);

    public virtual void ReturnToPending() => MoveTo(AppointmentStatus.Pending);

    public void RecordWeight(decimal actualWeightKg, SizeGroup? newSizeGroup = null)
    {
        ActualWeightKg = actualWeightKg;
        if (newSizeGroup is not null) SizeGroup = newSizeGroup.Value;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Reject()
    {
        if (Status != AppointmentStatus.Pending)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        Cancel(PetSpa.Domain.Enums.CancelReason.StoreUnable);
    }

    public void Cancel(CancelReason reason)
    {
        GetLifecycle().EnsureCancel(Status, reason);

        var now = DateTimeOffset.UtcNow;
        Status = AppointmentStatus.Cancelled;
        CancelReason = reason;
        CancelledAt = now;
        UpdatedAt = now;
    }

    public bool IsNoShowDue(DateTimeOffset now, int holdMinutes) =>
        Status == AppointmentStatus.Confirmed && now > GetScheduledStart().AddMinutes(holdMinutes);

    public void CancelAsNoShow(DateTimeOffset now, int holdMinutes)
    {
        if (!IsNoShowDue(now, holdMinutes))
            throw new BusinessException(ErrorCodes.InvalidTransition);

        Cancel(PetSpa.Domain.Enums.CancelReason.NoShow);
    }

    protected void BeginCustomerChange()
    {
        EnsureChangeableByCustomer();

        if (Status == AppointmentStatus.Confirmed) ReturnToPending();
        else UpdatedAt = DateTimeOffset.UtcNow;
    }

    protected void BeginManagerChange()
    {
        EnsureChangeableByManager();
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    protected void MoveTo(AppointmentStatus next)
    {
        GetLifecycle().EnsureTransition(Status, next);

        Status = next;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
