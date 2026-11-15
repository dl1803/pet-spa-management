using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class SpaAppointmentAssignStaffTests
{
    private static readonly DateTimeOffset SlotStart = new(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset BusyUntil = SlotStart.AddMinutes(135);

    private static SpaAppointment Spa(AppointmentStatus status, int staffRequired) => new()
    {
        AppointmentId = Guid.NewGuid(),
        Status = status,
        SlotStart = SlotStart,
        SlotEnd = SlotStart.AddMinutes(120),
        BusyUntil = BusyUntil,
        StaffRequired = (short)staffRequired,
    };

    [Fact]
    public void AssignStaff_WhenPendingAndCountMatches_ReturnsHoldingRowsCopiedFromAppointment()
    {
        var spa = Spa(AppointmentStatus.Pending, 2);
        var staffA = Guid.NewGuid();
        var staffB = Guid.NewGuid();

        var rows = spa.AssignStaff([staffA, staffB]);

        Assert.Equal(2, rows.Count);
        Assert.Contains(rows, r => r.StaffId == staffA);
        Assert.Contains(rows, r => r.StaffId == staffB);
        Assert.All(rows, r =>
        {
            Assert.Equal(spa.AppointmentId, r.AppointmentId);
            Assert.Equal(SlotStart, r.BusyFrom);
            Assert.Equal(BusyUntil, r.BusyUntil);
            Assert.True(r.IsHolding);
        });
    }

    [Theory]
    [InlineData(2, 1)]
    [InlineData(1, 2)]
    public void AssignStaff_WhenStaffCountDiffersFromRequired_ThrowsStaffCountMismatch(int required, int chosen)
    {
        var spa = Spa(AppointmentStatus.Pending, required);
        var staffIds = Enumerable.Range(0, chosen).Select(_ => Guid.NewGuid()).ToList();

        var ex = Assert.Throws<BusinessException>(() => spa.AssignStaff(staffIds));

        Assert.Equal(ErrorCodes.StaffCountMismatch, ex.Code);
    }

    [Fact]
    public void AssignStaff_WhenSameStaffChosenTwice_CountsOnce()
    {
        var spa = Spa(AppointmentStatus.Pending, 2);
        var staff = Guid.NewGuid();

        var ex = Assert.Throws<BusinessException>(() => spa.AssignStaff([staff, staff]));

        Assert.Equal(ErrorCodes.StaffCountMismatch, ex.Code);
    }

    [Theory]
    [InlineData(AppointmentStatus.Confirmed)]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void AssignStaff_WhenNotPending_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var spa = Spa(status, 1);

        var ex = Assert.Throws<BusinessException>(() => spa.AssignStaff([Guid.NewGuid()]));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, spa.Status);
    }

    [Fact]
    public void AssignStaff_WhenStaffIdsNull_ThrowsValidationError()
    {
        var spa = Spa(AppointmentStatus.Pending, 1);

        var ex = Assert.Throws<BusinessException>(() => spa.AssignStaff(null));

        Assert.Equal(ErrorCodes.ValidationError, ex.Code);
    }

    [Fact]
    public void AssignStaff_WhenStaffIdsEmpty_ThrowsValidationError()
    {
        var spa = Spa(AppointmentStatus.Pending, 1);

        var ex = Assert.Throws<BusinessException>(() => spa.AssignStaff([]));

        Assert.Equal(ErrorCodes.ValidationError, ex.Code);
    }

    [Fact]
    public void AssignStaff_UpdatesAppointmentUpdatedAt()
    {
        var past = DateTimeOffset.UtcNow.AddHours(-1);
        var spa = Spa(AppointmentStatus.Pending, 1);
        spa.UpdatedAt = past;

        spa.AssignStaff([Guid.NewGuid()]);

        Assert.True(spa.UpdatedAt > past);
    }
}

