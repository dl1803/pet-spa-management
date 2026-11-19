using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AppointmentManagerChangeTests
{
    private static readonly DateTimeOffset OldStart = new(2026, 12, 1, 3, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset NewStart = new(2026, 12, 2, 7, 0, 0, TimeSpan.Zero);

    private static SpaAppointment Spa(AppointmentStatus status, short staffRequired = 1) => new()
    {
        AppointmentId = Guid.NewGuid(),
        PetId = Guid.NewGuid(),
        SizeGroup = SizeGroup.Small,
        Status = status,
        SlotStart = OldStart,
        SlotEnd = OldStart.AddMinutes(60),
        BusyUntil = OldStart.AddMinutes(75),
        StaffRequired = staffRequired,
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

    private static Cage CageOf(Species species, SizeGroup sizeGroup, bool isActive = true) => new()
    {
        CageId = Guid.NewGuid(),
        Code = "A1",
        Species = species,
        SizeGroup = sizeGroup,
        IsActive = isActive,
    };

    private static void AssertCode(string code, Action action)
    {
        var ex = Assert.Throws<BusinessException>(action);
        Assert.Equal(code, ex.Code);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    public void EnsureChangeableByManager_AllowsPendingAndConfirmed(AppointmentStatus status)
    {
        Spa(status).EnsureChangeableByManager();
        Hotel(status).EnsureChangeableByManager();
    }

    [Theory]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void EnsureChangeableByManager_RejectsSpaStatusesAfterConfirmation(AppointmentStatus status) =>
        AssertCode(ErrorCodes.InvalidTransition, () => Spa(status).EnsureChangeableByManager());

    [Theory]
    [InlineData(AppointmentStatus.InStay)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void EnsureChangeableByManager_RejectsHotelStatusesAfterConfirmation(AppointmentStatus status) =>
        AssertCode(ErrorCodes.InvalidTransition, () => Hotel(status).EnsureChangeableByManager());

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    public void Spa_RescheduleByManager_ChangesScheduleAndKeepsStatus(AppointmentStatus status)
    {
        var appointment = Spa(status);
        var petId = Guid.NewGuid();

        appointment.RescheduleByManager(
            petId, SizeGroup.Large, NewStart, NewStart.AddMinutes(90), NewStart.AddMinutes(105), 2);

        Assert.Equal(status, appointment.Status);
        Assert.Equal(petId, appointment.PetId);
        Assert.Equal(SizeGroup.Large, appointment.SizeGroup);
        Assert.Equal(NewStart, appointment.SlotStart);
        Assert.Equal(NewStart.AddMinutes(90), appointment.SlotEnd);
        Assert.Equal(NewStart.AddMinutes(105), appointment.BusyUntil);
        Assert.Equal((short)2, appointment.StaffRequired);
    }

    [Fact]
    public void Spa_RescheduleByManager_RejectsStatusesThatCannotBeChanged()
    {
        var appointment = Spa(AppointmentStatus.Received);

        AssertCode(ErrorCodes.InvalidTransition, () => appointment.RescheduleByManager(
            Guid.NewGuid(), SizeGroup.Small, NewStart, NewStart.AddMinutes(60), NewStart.AddMinutes(75), 1));

        Assert.Equal(OldStart, appointment.SlotStart);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    public void Hotel_RescheduleByManager_ChangesStayAndKeepsStatusAndCage(AppointmentStatus status)
    {
        var appointment = Hotel(status);
        var cageId = appointment.CageId;
        var petId = Guid.NewGuid();

        appointment.RescheduleByManager(petId, SizeGroup.Medium, NewStart, NewStart.AddDays(3));

        Assert.Equal(status, appointment.Status);
        Assert.Equal(cageId, appointment.CageId);
        Assert.Equal(petId, appointment.PetId);
        Assert.Equal(SizeGroup.Medium, appointment.SizeGroup);
        Assert.Equal(NewStart, appointment.PlannedCheckIn);
        Assert.Equal(NewStart.AddDays(3), appointment.PlannedCheckOut);
    }

    [Fact]
    public void Hotel_RescheduleByManager_RejectsStatusesThatCannotBeChanged()
    {
        var appointment = Hotel(AppointmentStatus.InStay);

        AssertCode(ErrorCodes.InvalidTransition, () =>
            appointment.RescheduleByManager(Guid.NewGuid(), SizeGroup.Small, NewStart, NewStart.AddDays(1)));
    }

    [Fact]
    public void ReassignStaff_ReturnsHoldingRowsForTheCurrentWindowAndKeepsStatus()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, staffRequired: 2);
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();

        var rows = appointment.ReassignStaff([first, second]);

        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
        Assert.Equal(2, rows.Count);
        Assert.All(rows, r =>
        {
            Assert.Equal(appointment.AppointmentId, r.AppointmentId);
            Assert.Equal(appointment.SlotStart, r.BusyFrom);
            Assert.Equal(appointment.BusyUntil, r.BusyUntil);
            Assert.True(r.IsHolding);
        });
        Assert.Equal(
            new[] { first, second }.OrderBy(id => id).ToArray(),
            rows.Select(r => r.StaffId).OrderBy(id => id).ToArray());
    }

    [Fact]
    public void ReassignStaff_RejectsWrongCountAndDuplicates()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, staffRequired: 2);
        var same = Guid.NewGuid();

        AssertCode(ErrorCodes.StaffCountMismatch, () => appointment.ReassignStaff([Guid.NewGuid()]));
        AssertCode(ErrorCodes.StaffCountMismatch, () => appointment.ReassignStaff([same, same]));
        AssertCode(ErrorCodes.StaffCountMismatch, () =>
            appointment.ReassignStaff([Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid()]));
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void ReassignStaff_RequiresConfirmed(AppointmentStatus status) =>
        AssertCode(ErrorCodes.InvalidTransition, () => Spa(status).ReassignStaff([Guid.NewGuid()]));

    [Fact]
    public void ReassignCage_SetsCageAndKeepsStatus()
    {
        var appointment = Hotel(AppointmentStatus.Confirmed);
        var cage = CageOf(Species.Dog, SizeGroup.Small);

        appointment.ReassignCage(cage, Species.Dog);

        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
        Assert.Equal(cage.CageId, appointment.CageId);
    }

    [Fact]
    public void ReassignCage_RejectsInactiveWrongSpeciesAndWrongSize()
    {
        var appointment = Hotel(AppointmentStatus.Confirmed);
        var before = appointment.CageId;

        AssertCode(ErrorCodes.CageConflict, () =>
            appointment.ReassignCage(CageOf(Species.Dog, SizeGroup.Small, isActive: false), Species.Dog));
        AssertCode(ErrorCodes.CageConflict, () =>
            appointment.ReassignCage(CageOf(Species.Cat, SizeGroup.Small), Species.Dog));
        AssertCode(ErrorCodes.CageConflict, () =>
            appointment.ReassignCage(CageOf(Species.Dog, SizeGroup.Large), Species.Dog));

        Assert.Equal(before, appointment.CageId);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.InStay)]
    public void ReassignCage_RequiresConfirmed(AppointmentStatus status) =>
        AssertCode(ErrorCodes.InvalidTransition, () =>
            Hotel(status).ReassignCage(CageOf(Species.Dog, SizeGroup.Small), Species.Dog));
}
