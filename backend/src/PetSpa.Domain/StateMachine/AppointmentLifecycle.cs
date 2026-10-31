using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Domain.StateMachine;

public sealed class AppointmentLifecycle
{
    private readonly Dictionary<AppointmentStatus, AppointmentStatus[]> transitions;
    private readonly Dictionary<AppointmentStatus, CancelReason[]> cancelReasons;

    private AppointmentLifecycle(
        Dictionary<AppointmentStatus, AppointmentStatus[]> transitions,
        Dictionary<AppointmentStatus, CancelReason[]> cancelReasons)
    {
        this.transitions = transitions;
        this.cancelReasons = cancelReasons;
    }

    public static AppointmentLifecycle Spa { get; } = new(
        new()
        {
            [AppointmentStatus.Pending] = [AppointmentStatus.Confirmed],
            [AppointmentStatus.Confirmed] = [AppointmentStatus.Pending, AppointmentStatus.Received],
            [AppointmentStatus.Received] = [AppointmentStatus.InProgress],
            [AppointmentStatus.InProgress] = [AppointmentStatus.Completed],
        },
        new()
        {
            [AppointmentStatus.Pending] = [CancelReason.CustomerCancelled, CancelReason.StoreUnable, CancelReason.CustomerBeyondDeadline],
            [AppointmentStatus.Confirmed] = [CancelReason.CustomerCancelled, CancelReason.StoreUnable, CancelReason.CustomerBeyondDeadline, CancelReason.NoShow],
            [AppointmentStatus.Received] = [CancelReason.StoreUnable, CancelReason.CustomerBeyondDeadline, CancelReason.CostNotConfirmed],
            [AppointmentStatus.InProgress] = [CancelReason.StoreUnable, CancelReason.CustomerBeyondDeadline],
        });

    public static AppointmentLifecycle Hotel { get; } = new(
        new()
        {
            [AppointmentStatus.Pending] = [AppointmentStatus.Confirmed],
            [AppointmentStatus.Confirmed] = [AppointmentStatus.Pending, AppointmentStatus.InStay],
            [AppointmentStatus.InStay] = [AppointmentStatus.Completed],
        },
        new()
        {
            [AppointmentStatus.Pending] = [CancelReason.CustomerCancelled, CancelReason.StoreUnable, CancelReason.CustomerBeyondDeadline],
            [AppointmentStatus.Confirmed] = [CancelReason.CustomerCancelled, CancelReason.StoreUnable, CancelReason.CustomerBeyondDeadline, CancelReason.NoShow, CancelReason.CostNotConfirmed],
            [AppointmentStatus.InStay] = [CancelReason.StoreUnable, CancelReason.CustomerBeyondDeadline],
        });

    public bool CanTransition(AppointmentStatus from, AppointmentStatus to) =>
        transitions.TryGetValue(from, out var allowed) && allowed.Contains(to);

    public bool CanCancel(AppointmentStatus from, CancelReason reason) =>
        cancelReasons.TryGetValue(from, out var allowed) && allowed.Contains(reason);

    public IReadOnlyCollection<AppointmentStatus> GetAllowedTransitions(AppointmentStatus from) =>
        transitions.TryGetValue(from, out var allowed) ? allowed : [];

    public IReadOnlyCollection<CancelReason> GetAllowedCancelReasons(AppointmentStatus from) =>
        cancelReasons.TryGetValue(from, out var allowed) ? allowed : [];

    public void EnsureTransition(AppointmentStatus from, AppointmentStatus to)
    {
        if (!CanTransition(from, to))
            throw new BusinessException(ErrorCodes.InvalidTransition);
    }

    public void EnsureCancel(AppointmentStatus from, CancelReason reason)
    {
        if (!CanCancel(from, reason))
            throw new BusinessException(ErrorCodes.InvalidTransition);
    }
}
