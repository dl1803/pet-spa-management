using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class SpaAppointmentCompleteTests
{
    private static SpaAppointment InProgressAppointment() =>
        new() { Status = AppointmentStatus.InProgress };

    private static List<AppointmentService> DoneLines(int count = 2) =>
        Enumerable.Range(0, count)
            .Select(_ => new AppointmentService { ServiceId = Guid.NewGuid(), IsDone = true })
            .ToList();

    [Fact]
    public void EnsureCanComplete_WhenAllConditionsMet_DoesNotThrowAndKeepsStatus()
    {
        var spa = InProgressAppointment();

        spa.EnsureCanComplete(false, DoneLines(), true);

        Assert.Equal(AppointmentStatus.InProgress, spa.Status);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void EnsureCanComplete_WhenNotInProgress_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var spa = new SpaAppointment { Status = status };

        var ex = Assert.Throws<BusinessException>(() => spa.EnsureCanComplete(false, DoneLines(), true));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
    }

    [Fact]
    public void EnsureCanComplete_WhenCostConfirmationPending_ThrowsCostConfirmationPending()
    {
        var spa = InProgressAppointment();

        var ex = Assert.Throws<BusinessException>(() => spa.EnsureCanComplete(true, DoneLines(), true));

        Assert.Equal(ErrorCodes.CostConfirmationPending, ex.Code);
    }

    [Fact]
    public void EnsureCanComplete_WhenNoServiceLines_ThrowsServicesIncomplete()
    {
        var spa = InProgressAppointment();

        var ex = Assert.Throws<BusinessException>(() => spa.EnsureCanComplete(false, [], true));

        Assert.Equal(ErrorCodes.ServicesIncomplete, ex.Code);
    }

    [Fact]
    public void EnsureCanComplete_WhenAnyServiceNotDone_ThrowsServicesIncomplete()
    {
        var spa = InProgressAppointment();
        var lines = DoneLines();
        lines.Add(new AppointmentService { ServiceId = Guid.NewGuid(), IsDone = false });

        var ex = Assert.Throws<BusinessException>(() => spa.EnsureCanComplete(false, lines, true));

        Assert.Equal(ErrorCodes.ServicesIncomplete, ex.Code);
    }

    [Fact]
    public void EnsureCanComplete_WhenNoAfterPhoto_ThrowsPhotoRequired()
    {
        var spa = InProgressAppointment();

        var ex = Assert.Throws<BusinessException>(() => spa.EnsureCanComplete(false, DoneLines(), false));

        Assert.Equal(ErrorCodes.PhotoRequired, ex.Code);
    }

    [Fact]
    public void EnsureCanComplete_WhenStatusWrongAndEverythingElseMissing_ThrowsInvalidTransitionFirst()
    {
        var spa = new SpaAppointment { Status = AppointmentStatus.Received };

        var ex = Assert.Throws<BusinessException>(() => spa.EnsureCanComplete(true, [], false));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
    }

    [Fact]
    public void EnsureCanComplete_WhenPendingConfirmationAndServicesAndPhotoMissing_ThrowsCostConfirmationPendingFirst()
    {
        var spa = InProgressAppointment();

        var ex = Assert.Throws<BusinessException>(() => spa.EnsureCanComplete(true, [], false));

        Assert.Equal(ErrorCodes.CostConfirmationPending, ex.Code);
    }

    [Fact]
    public void EnsureCanComplete_WhenServicesAndPhotoMissing_ThrowsServicesIncompleteFirst()
    {
        var spa = InProgressAppointment();

        var ex = Assert.Throws<BusinessException>(() => spa.EnsureCanComplete(false, [], false));

        Assert.Equal(ErrorCodes.ServicesIncomplete, ex.Code);
    }
}
