using PetSpa.Domain.Enums;
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

    public bool CanTransitionTo(AppointmentStatus next) => GetLifecycle().CanTransition(Status, next);

    public bool CanCancelWith(CancelReason reason) => GetLifecycle().CanCancel(Status, reason);

    public void Confirm() => MoveTo(AppointmentStatus.Confirmed);

    public virtual void ReturnToPending() => MoveTo(AppointmentStatus.Pending);

    public void Cancel(CancelReason reason)
    {
        GetLifecycle().EnsureCancel(Status, reason);

        var now = DateTimeOffset.UtcNow;
        Status = AppointmentStatus.Cancelled;
        CancelReason = reason;
        CancelledAt = now;
        UpdatedAt = now;
    }

    protected void MoveTo(AppointmentStatus next)
    {
        GetLifecycle().EnsureTransition(Status, next);

        Status = next;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
