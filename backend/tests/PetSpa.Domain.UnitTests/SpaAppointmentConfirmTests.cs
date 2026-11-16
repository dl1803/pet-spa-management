using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class SpaAppointmentConfirmTests
{
    private static SpaAppointment Spa(AppointmentStatus status, int staffRequired) => new()
    {
        AppointmentId = Guid.NewGuid(),
        Status = status,
        StaffRequired = (short)staffRequired,
    };

    [Theory]
    [InlineData(1, 1)]
    [InlineData(2, 2)]
    public void ConfirmWithAssignedStaff_WhenPendingAndCountMatches_Confirms(int required, int assigned)
    {
        var spa = Spa(AppointmentStatus.Pending, required);

        spa.ConfirmWithAssignedStaff(assigned);

        Assert.Equal(AppointmentStatus.Confirmed, spa.Status);
    }

    [Theory]
    [InlineData(1, 0)]
    [InlineData(2, 1)]
    [InlineData(1, 2)]
    public void ConfirmWithAssignedStaff_WhenCountDiffersFromRequired_ThrowsStaffCountMismatch(int required, int assigned)
    {
        var spa = Spa(AppointmentStatus.Pending, required);

        var ex = Assert.Throws<BusinessException>(() => spa.ConfirmWithAssignedStaff(assigned));

        Assert.Equal(ErrorCodes.StaffCountMismatch, ex.Code);
        Assert.Equal(AppointmentStatus.Pending, spa.Status);
    }

    [Theory]
    [InlineData(AppointmentStatus.Confirmed)]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void ConfirmWithAssignedStaff_WhenNotPending_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var spa = Spa(status, 1);

        var ex = Assert.Throws<BusinessException>(() => spa.ConfirmWithAssignedStaff(0));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, spa.Status);
    }
}

