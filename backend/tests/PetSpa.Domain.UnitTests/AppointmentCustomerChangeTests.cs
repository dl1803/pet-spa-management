using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AppointmentCustomerChangeTests
{
    private static readonly DateTimeOffset OldStart = new(2026, 12, 1, 3, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset NewStart = new(2026, 12, 2, 7, 0, 0, TimeSpan.Zero);

    private static SpaAppointment Spa(AppointmentStatus status) => new()
    {
        AppointmentId = Guid.NewGuid(),
        PetId = Guid.NewGuid(),
        SizeGroup = SizeGroup.Small,
        Status = status,
        SlotStart = OldStart,
        SlotEnd = OldStart.AddMinutes(60),
        BusyUntil = OldStart.AddMinutes(75),
        StaffRequired = 1,
    };

    private static HotelAppointment Hotel(AppointmentStatus status) => new()
    {
        AppointmentId = Guid.NewGuid(),
        PetId = Guid.NewGuid(),
        SizeGroup = SizeGroup.Small,
        Status = status,
        PlannedCheckIn = OldStart,
        PlannedCheckOut = OldStart.AddDays(2),
        CageId = Guid.NewGuid(),
    };

    private static void AssertInvalidTransition(Action action)
    {
        var ex = Assert.Throws<BusinessException>(action);
        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
    }

    [Fact]
    public void GetScheduledStart_ReturnsSlotStartForSpaAndPlannedCheckInForHotel()
    {
        Assert.Equal(OldStart, Spa(AppointmentStatus.Pending).GetScheduledStart());
        Assert.Equal(OldStart, Hotel(AppointmentStatus.Pending).GetScheduledStart());
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    public void EnsureChangeableByCustomer_AllowsPendingAndConfirmed(AppointmentStatus status)
    {
        Spa(status).EnsureChangeableByCustomer();
        Hotel(status).EnsureChangeableByCustomer();
    }

    [Theory]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void SpaReschedule_WhenNotChangeable_ThrowsInvalidTransitionAndKeepsSchedule(AppointmentStatus status)
    {
        var spa = Spa(status);
        var petId = spa.PetId;

        AssertInvalidTransition(() => spa.Reschedule(
            Guid.NewGuid(), SizeGroup.Large, NewStart, NewStart.AddMinutes(90), NewStart.AddMinutes(105), 2));

        Assert.Equal(status, spa.Status);
        Assert.Equal(petId, spa.PetId);
        Assert.Equal(OldStart, spa.SlotStart);
        Assert.Equal(SizeGroup.Small, spa.SizeGroup);
    }

    [Theory]
    [InlineData(AppointmentStatus.InStay)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void HotelReschedule_WhenNotChangeable_ThrowsInvalidTransitionAndKeepsStay(AppointmentStatus status)
    {
        var hotel = Hotel(status);
        var cageId = hotel.CageId;

        AssertInvalidTransition(() => hotel.Reschedule(
            Guid.NewGuid(), SizeGroup.Large, NewStart, NewStart.AddDays(1)));

        Assert.Equal(status, hotel.Status);
        Assert.Equal(OldStart, hotel.PlannedCheckIn);
        Assert.Equal(cageId, hotel.CageId);
    }

    [Fact]
    public void SpaReschedule_WhenConfirmed_ReturnsToPendingAndReplacesSchedule()
    {
        var spa = Spa(AppointmentStatus.Confirmed);
        var newPetId = Guid.NewGuid();

        spa.Reschedule(newPetId, SizeGroup.Large, NewStart, NewStart.AddMinutes(90), NewStart.AddMinutes(105), 2);

        Assert.Equal(AppointmentStatus.Pending, spa.Status);
        Assert.Equal(newPetId, spa.PetId);
        Assert.Equal(SizeGroup.Large, spa.SizeGroup);
        Assert.Equal(NewStart, spa.SlotStart);
        Assert.Equal(NewStart.AddMinutes(90), spa.SlotEnd);
        Assert.Equal(NewStart.AddMinutes(105), spa.BusyUntil);
        Assert.Equal(2, spa.StaffRequired);
    }

    [Fact]
    public void SpaReschedule_WhenPending_StaysPending()
    {
        var spa = Spa(AppointmentStatus.Pending);

        spa.Reschedule(spa.PetId, SizeGroup.Small, NewStart, NewStart.AddMinutes(60), NewStart.AddMinutes(75), 1);

        Assert.Equal(AppointmentStatus.Pending, spa.Status);
        Assert.Equal(NewStart, spa.SlotStart);
    }

    [Fact]
    public void HotelReschedule_WhenConfirmed_ReturnsToPendingAndClearsCage()
    {
        var hotel = Hotel(AppointmentStatus.Confirmed);
        var newPetId = Guid.NewGuid();

        hotel.Reschedule(newPetId, SizeGroup.Medium, NewStart, NewStart.AddDays(3));

        Assert.Equal(AppointmentStatus.Pending, hotel.Status);
        Assert.Null(hotel.CageId);
        Assert.Equal(newPetId, hotel.PetId);
        Assert.Equal(SizeGroup.Medium, hotel.SizeGroup);
        Assert.Equal(NewStart, hotel.PlannedCheckIn);
        Assert.Equal(NewStart.AddDays(3), hotel.PlannedCheckOut);
    }

    [Fact]
    public void HotelReschedule_WhenPending_StaysPending()
    {
        var hotel = Hotel(AppointmentStatus.Pending);
        hotel.CageId = null;

        hotel.Reschedule(hotel.PetId, SizeGroup.Small, NewStart, NewStart.AddDays(1));

        Assert.Equal(AppointmentStatus.Pending, hotel.Status);
        Assert.Equal(NewStart, hotel.PlannedCheckIn);
    }
}
