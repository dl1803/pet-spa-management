using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AppointmentNoShowTests
{
    private const int HoldMinutes = 15;
    private static readonly DateTimeOffset Start = new(2026, 12, 1, 3, 0, 0, TimeSpan.Zero);

    private static SpaAppointment Spa(AppointmentStatus status) => new()
    {
        AppointmentId = Guid.NewGuid(),
        PetId = Guid.NewGuid(),
        SizeGroup = SizeGroup.Small,
        Status = status,
        SlotStart = Start,
        SlotEnd = Start.AddMinutes(60),
        BusyUntil = Start.AddMinutes(75),
        StaffRequired = 1,
    };

    private static HotelAppointment Hotel(AppointmentStatus status) => new()
    {
        AppointmentId = Guid.NewGuid(),
        PetId = Guid.NewGuid(),
        SizeGroup = SizeGroup.Small,
        Status = status,
        PlannedCheckIn = Start,
        PlannedCheckOut = Start.AddDays(2),
        CageId = Guid.NewGuid(),
    };

    private static Appointment Create(bool isHotel, AppointmentStatus status) =>
        isHotel ? Hotel(status) : Spa(status);

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void IsNoShowDue_ConfirmedAtExactlyHoldLimit_ReturnsFalse(bool isHotel)
    {
        var appointment = Create(isHotel, AppointmentStatus.Confirmed);

        Assert.False(appointment.IsNoShowDue(Start.AddMinutes(HoldMinutes), HoldMinutes));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void IsNoShowDue_ConfirmedPastHoldLimit_ReturnsTrue(bool isHotel)
    {
        var appointment = Create(isHotel, AppointmentStatus.Confirmed);

        Assert.True(appointment.IsNoShowDue(Start.AddMinutes(HoldMinutes).AddSeconds(1), HoldMinutes));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void IsNoShowDue_ConfirmedBeforeStart_ReturnsFalse(bool isHotel)
    {
        var appointment = Create(isHotel, AppointmentStatus.Confirmed);

        Assert.False(appointment.IsNoShowDue(Start.AddMinutes(-30), HoldMinutes));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void IsNoShowDue_UsesTheGivenHoldMinutes(bool isHotel)
    {
        var appointment = Create(isHotel, AppointmentStatus.Confirmed);
        var now = Start.AddMinutes(20);

        Assert.False(appointment.IsNoShowDue(now, 30));
        Assert.True(appointment.IsNoShowDue(now, 15));
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.InStay)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void IsNoShowDue_NotConfirmed_ReturnsFalseEvenLongAfterStart(AppointmentStatus status)
    {
        foreach (var appointment in new Appointment[] { Spa(status), Hotel(status) })
            Assert.False(appointment.IsNoShowDue(Start.AddHours(5), HoldMinutes));
    }

    [Fact]
    public void CancelAsNoShow_DueSpa_CancelsWithNoShowReason()
    {
        var spa = Spa(AppointmentStatus.Confirmed);

        spa.CancelAsNoShow(Start.AddMinutes(20), HoldMinutes);

        Assert.Equal(AppointmentStatus.Cancelled, spa.Status);
        Assert.Equal(CancelReason.NoShow, spa.CancelReason);
        Assert.NotNull(spa.CancelledAt);
    }

    [Fact]
    public void CancelAsNoShow_DueHotel_CancelsWithNoShowReasonAndKeepsCageId()
    {
        var cageId = Guid.NewGuid();
        var stay = Hotel(AppointmentStatus.Confirmed);
        stay.CageId = cageId;

        stay.CancelAsNoShow(Start.AddMinutes(20), HoldMinutes);

        Assert.Equal(AppointmentStatus.Cancelled, stay.Status);
        Assert.Equal(CancelReason.NoShow, stay.CancelReason);
        Assert.NotNull(stay.CancelledAt);
        Assert.Equal<Guid?>(cageId, stay.CageId);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void CancelAsNoShow_NotYetDue_ThrowsInvalidTransitionAndKeepsState(bool isHotel)
    {
        var appointment = Create(isHotel, AppointmentStatus.Confirmed);

        var ex = Assert.Throws<BusinessException>(
            () => appointment.CancelAsNoShow(Start.AddMinutes(HoldMinutes), HoldMinutes));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
        Assert.Null(appointment.CancelReason);
        Assert.Null(appointment.CancelledAt);
    }

    [Fact]
    public void CancelAsNoShow_AlreadyReceived_ThrowsInvalidTransitionAndKeepsState()
    {
        var spa = Spa(AppointmentStatus.Received);

        var ex = Assert.Throws<BusinessException>(
            () => spa.CancelAsNoShow(Start.AddHours(5), HoldMinutes));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(AppointmentStatus.Received, spa.Status);
        Assert.Null(spa.CancelReason);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void IsNoShowDue_ConfirmedWithActualWeight_ReturnsFalse(bool isHotel)
    {
        var appointment = Create(isHotel, AppointmentStatus.Confirmed);
        appointment.RecordWeight(4.5m);

        Assert.False(appointment.IsNoShowDue(Start.AddHours(5), HoldMinutes));
    }

    [Fact]
    public void CancelAsNoShow_ConfirmedHotelWithActualWeight_ThrowsInvalidTransitionAndKeepsState()
    {
        var stay = Hotel(AppointmentStatus.Confirmed);
        stay.RecordWeight(4.5m);

        var ex = Assert.Throws<BusinessException>(
            () => stay.CancelAsNoShow(Start.AddHours(5), HoldMinutes));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, stay.Status);
        Assert.Null(stay.CancelReason);
        Assert.Null(stay.CancelledAt);
    }
}
