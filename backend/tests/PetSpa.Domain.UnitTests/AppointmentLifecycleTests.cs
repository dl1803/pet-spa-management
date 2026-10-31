using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.StateMachine;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AppointmentLifecycleTests
{
    private static SpaAppointment Spa(AppointmentStatus status) => new() { Status = status };

    private static HotelAppointment Hotel(AppointmentStatus status) => new() { Status = status };

    private static void AssertInvalidTransition(Action action)
    {
        var ex = Assert.Throws<BusinessException>(action);
        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
    }

    [Fact]
    public void Spa_ForwardFlow_ReachesCompleted()
    {
        var appointment = new SpaAppointment();
        Assert.Equal(AppointmentStatus.Pending, appointment.Status);

        appointment.Confirm();
        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);

        appointment.Receive();
        Assert.Equal(AppointmentStatus.Received, appointment.Status);

        appointment.Start();
        Assert.Equal(AppointmentStatus.InProgress, appointment.Status);

        appointment.Complete();
        Assert.Equal(AppointmentStatus.Completed, appointment.Status);
    }

    [Fact]
    public void Hotel_ForwardFlow_ReachesCompleted()
    {
        var appointment = new HotelAppointment();
        Assert.Equal(AppointmentStatus.Pending, appointment.Status);

        appointment.Confirm();
        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);

        appointment.CheckIn();
        Assert.Equal(AppointmentStatus.InStay, appointment.Status);

        appointment.CheckOut();
        Assert.Equal(AppointmentStatus.Completed, appointment.Status);
    }

    [Fact]
    public void Spa_PendingToInProgress_IsRejected()
    {
        var appointment = Spa(AppointmentStatus.Pending);

        AssertInvalidTransition(appointment.Start);

        Assert.Equal(AppointmentStatus.Pending, appointment.Status);
    }

    [Fact]
    public void Hotel_ConfirmedToCompleted_IsRejected()
    {
        var appointment = Hotel(AppointmentStatus.Confirmed);

        AssertInvalidTransition(appointment.CheckOut);

        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
    }

    [Fact]
    public void Spa_OutOfOrderMoves_AreRejected()
    {
        var cases = new (AppointmentStatus From, Action<SpaAppointment> Move)[]
        {
            (AppointmentStatus.Pending, a => a.Receive()),
            (AppointmentStatus.Pending, a => a.Start()),
            (AppointmentStatus.Pending, a => a.Complete()),
            (AppointmentStatus.Confirmed, a => a.Confirm()),
            (AppointmentStatus.Confirmed, a => a.Start()),
            (AppointmentStatus.Confirmed, a => a.Complete()),
            (AppointmentStatus.Received, a => a.Confirm()),
            (AppointmentStatus.Received, a => a.Receive()),
            (AppointmentStatus.Received, a => a.Complete()),
            (AppointmentStatus.InProgress, a => a.Confirm()),
            (AppointmentStatus.InProgress, a => a.Receive()),
            (AppointmentStatus.InProgress, a => a.Start()),
        };

        foreach (var (from, move) in cases)
        {
            var appointment = Spa(from);

            AssertInvalidTransition(() => move(appointment));

            Assert.Equal(from, appointment.Status);
        }
    }

    [Fact]
    public void Hotel_OutOfOrderMoves_AreRejected()
    {
        var cases = new (AppointmentStatus From, Action<HotelAppointment> Move)[]
        {
            (AppointmentStatus.Pending, a => a.CheckIn()),
            (AppointmentStatus.Pending, a => a.CheckOut()),
            (AppointmentStatus.Confirmed, a => a.Confirm()),
            (AppointmentStatus.Confirmed, a => a.CheckOut()),
            (AppointmentStatus.InStay, a => a.Confirm()),
            (AppointmentStatus.InStay, a => a.CheckIn()),
        };

        foreach (var (from, move) in cases)
        {
            var appointment = Hotel(from);

            AssertInvalidTransition(() => move(appointment));

            Assert.Equal(from, appointment.Status);
        }
    }

    [Theory]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void Spa_TerminalStatus_RejectsEveryMove(AppointmentStatus status)
    {
        var appointment = Spa(status);
        Action[] moves =
        [
            appointment.Confirm,
            appointment.ReturnToPending,
            appointment.Receive,
            appointment.Start,
            appointment.Complete,
            () => appointment.Cancel(CancelReason.StoreUnable),
        ];

        foreach (var move in moves)
            AssertInvalidTransition(move);

        Assert.Equal(status, appointment.Status);
    }

    [Theory]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void Hotel_TerminalStatus_RejectsEveryMove(AppointmentStatus status)
    {
        var appointment = Hotel(status);
        Action[] moves =
        [
            appointment.Confirm,
            appointment.ReturnToPending,
            appointment.CheckIn,
            appointment.CheckOut,
            () => appointment.Cancel(CancelReason.StoreUnable),
        ];

        foreach (var move in moves)
            AssertInvalidTransition(move);

        Assert.Equal(status, appointment.Status);
    }

    [Fact]
    public void Spa_ReturnToPending_FromConfirmed_Succeeds()
    {
        var appointment = Spa(AppointmentStatus.Confirmed);

        appointment.ReturnToPending();

        Assert.Equal(AppointmentStatus.Pending, appointment.Status);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void Spa_ReturnToPending_FromOtherStatus_IsRejected(AppointmentStatus status)
    {
        var appointment = Spa(status);

        AssertInvalidTransition(appointment.ReturnToPending);

        Assert.Equal(status, appointment.Status);
    }

    [Fact]
    public void Hotel_ReturnToPending_FromConfirmed_ClearsCage()
    {
        var appointment = Hotel(AppointmentStatus.Confirmed);
        appointment.CageId = Guid.NewGuid();

        appointment.ReturnToPending();

        Assert.Equal(AppointmentStatus.Pending, appointment.Status);
        Assert.Null(appointment.CageId);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.InStay)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void Hotel_ReturnToPending_FromOtherStatus_IsRejectedAndKeepsCage(AppointmentStatus status)
    {
        var cageId = Guid.NewGuid();
        var appointment = Hotel(status);
        appointment.CageId = cageId;

        AssertInvalidTransition(appointment.ReturnToPending);

        Assert.Equal(status, appointment.Status);
        Assert.Equal(cageId, appointment.CageId);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending, CancelReason.CustomerCancelled)]
    [InlineData(AppointmentStatus.Pending, CancelReason.StoreUnable)]
    [InlineData(AppointmentStatus.Pending, CancelReason.CustomerBeyondDeadline)]
    [InlineData(AppointmentStatus.Confirmed, CancelReason.CustomerCancelled)]
    [InlineData(AppointmentStatus.Confirmed, CancelReason.StoreUnable)]
    [InlineData(AppointmentStatus.Confirmed, CancelReason.CustomerBeyondDeadline)]
    [InlineData(AppointmentStatus.Confirmed, CancelReason.NoShow)]
    [InlineData(AppointmentStatus.Received, CancelReason.StoreUnable)]
    [InlineData(AppointmentStatus.Received, CancelReason.CustomerBeyondDeadline)]
    [InlineData(AppointmentStatus.Received, CancelReason.CostNotConfirmed)]
    [InlineData(AppointmentStatus.InProgress, CancelReason.StoreUnable)]
    [InlineData(AppointmentStatus.InProgress, CancelReason.CustomerBeyondDeadline)]
    public void Spa_Cancel_WithAllowedReason_SetsCancelledAndReason(AppointmentStatus status, CancelReason reason)
    {
        var appointment = Spa(status);

        appointment.Cancel(reason);

        Assert.Equal(AppointmentStatus.Cancelled, appointment.Status);
        Assert.Equal(reason, appointment.CancelReason);
        Assert.NotNull(appointment.CancelledAt);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending, CancelReason.NoShow)]
    [InlineData(AppointmentStatus.Pending, CancelReason.CostNotConfirmed)]
    [InlineData(AppointmentStatus.Confirmed, CancelReason.CostNotConfirmed)]
    [InlineData(AppointmentStatus.Received, CancelReason.CustomerCancelled)]
    [InlineData(AppointmentStatus.Received, CancelReason.NoShow)]
    [InlineData(AppointmentStatus.InProgress, CancelReason.CustomerCancelled)]
    [InlineData(AppointmentStatus.InProgress, CancelReason.NoShow)]
    [InlineData(AppointmentStatus.InProgress, CancelReason.CostNotConfirmed)]
    public void Spa_Cancel_WithDisallowedReason_IsRejected(AppointmentStatus status, CancelReason reason)
    {
        var appointment = Spa(status);

        AssertInvalidTransition(() => appointment.Cancel(reason));

        Assert.Equal(status, appointment.Status);
        Assert.Null(appointment.CancelReason);
        Assert.Null(appointment.CancelledAt);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending, CancelReason.CustomerCancelled)]
    [InlineData(AppointmentStatus.Pending, CancelReason.StoreUnable)]
    [InlineData(AppointmentStatus.Pending, CancelReason.CustomerBeyondDeadline)]
    [InlineData(AppointmentStatus.Confirmed, CancelReason.CustomerCancelled)]
    [InlineData(AppointmentStatus.Confirmed, CancelReason.StoreUnable)]
    [InlineData(AppointmentStatus.Confirmed, CancelReason.CustomerBeyondDeadline)]
    [InlineData(AppointmentStatus.Confirmed, CancelReason.NoShow)]
    [InlineData(AppointmentStatus.Confirmed, CancelReason.CostNotConfirmed)]
    [InlineData(AppointmentStatus.InStay, CancelReason.StoreUnable)]
    [InlineData(AppointmentStatus.InStay, CancelReason.CustomerBeyondDeadline)]
    public void Hotel_Cancel_WithAllowedReason_SetsCancelledAndReason(AppointmentStatus status, CancelReason reason)
    {
        var appointment = Hotel(status);

        appointment.Cancel(reason);

        Assert.Equal(AppointmentStatus.Cancelled, appointment.Status);
        Assert.Equal(reason, appointment.CancelReason);
        Assert.NotNull(appointment.CancelledAt);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending, CancelReason.NoShow)]
    [InlineData(AppointmentStatus.Pending, CancelReason.CostNotConfirmed)]
    [InlineData(AppointmentStatus.InStay, CancelReason.CustomerCancelled)]
    [InlineData(AppointmentStatus.InStay, CancelReason.NoShow)]
    [InlineData(AppointmentStatus.InStay, CancelReason.CostNotConfirmed)]
    public void Hotel_Cancel_WithDisallowedReason_IsRejected(AppointmentStatus status, CancelReason reason)
    {
        var appointment = Hotel(status);

        AssertInvalidTransition(() => appointment.Cancel(reason));

        Assert.Equal(status, appointment.Status);
        Assert.Null(appointment.CancelReason);
        Assert.Null(appointment.CancelledAt);
    }

    [Fact]
    public void Guard_CanTransition_ReturnsTrueForAllowedAndFalseForDisallowed()
    {
        var spa = new SpaAppointment { Status = AppointmentStatus.Pending };
        Assert.True(spa.CanTransitionTo(AppointmentStatus.Confirmed));
        Assert.False(spa.CanTransitionTo(AppointmentStatus.InProgress));
        Assert.False(spa.CanTransitionTo(AppointmentStatus.Completed));

        var hotel = new HotelAppointment { Status = AppointmentStatus.Confirmed };
        Assert.True(hotel.CanTransitionTo(AppointmentStatus.InStay));
        Assert.True(hotel.CanTransitionTo(AppointmentStatus.Pending));
        Assert.False(hotel.CanTransitionTo(AppointmentStatus.Completed));
    }

    [Fact]
    public void Guard_CanCancel_ReturnsTrueForAllowedAndFalseForDisallowed()
    {
        var spa = new SpaAppointment { Status = AppointmentStatus.Received };
        Assert.True(spa.CanCancelWith(CancelReason.CostNotConfirmed));
        Assert.False(spa.CanCancelWith(CancelReason.CustomerCancelled));

        var hotel = new HotelAppointment { Status = AppointmentStatus.Confirmed };
        Assert.True(hotel.CanCancelWith(CancelReason.CostNotConfirmed));
        Assert.True(hotel.CanCancelWith(CancelReason.NoShow));
    }

    [Fact]
    public void Guard_GetAllowedCollections_ReturnAccurateLists()
    {
        var spaPendingTransitions = AppointmentLifecycle.Spa.GetAllowedTransitions(AppointmentStatus.Pending);
        Assert.Contains(AppointmentStatus.Confirmed, spaPendingTransitions);
        Assert.Single(spaPendingTransitions);

        var hotelConfirmedCancels = AppointmentLifecycle.Hotel.GetAllowedCancelReasons(AppointmentStatus.Confirmed);
        Assert.Equal(5, hotelConfirmedCancels.Count);
        Assert.Contains(CancelReason.CostNotConfirmed, hotelConfirmedCancels);
    }
}
