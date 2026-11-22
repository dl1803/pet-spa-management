using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class SpaAppointmentPhotoValidityTests
{
    private static readonly DateTimeOffset StartedAt = new(2026, 11, 22, 9, 0, 0, TimeSpan.Zero);

    private static SpaAppointment Spa(AppointmentStatus status) => new()
    {
        AppointmentId = Guid.NewGuid(),
        Status = status,
    };

    [Theory]
    [InlineData(3600)]
    [InlineData(604800)]
    public void EnsureBeforePhotoValid_WhenPhotoIsWithinWindow_DoesNotThrow(int secondsBeforeStart)
    {
        var spa = Spa(AppointmentStatus.Received);

        spa.EnsureBeforePhotoValid(StartedAt.AddSeconds(-secondsBeforeStart), 7, StartedAt);
    }

    [Fact]
    public void EnsureBeforePhotoValid_WhenPhotoIsOlderThanWindow_ThrowsPhotoRequired()
    {
        var spa = Spa(AppointmentStatus.Received);

        var ex = Assert.Throws<BusinessException>(
            () => spa.EnsureBeforePhotoValid(StartedAt.AddSeconds(-604801), 7, StartedAt));

        Assert.Equal(ErrorCodes.PhotoRequired, ex.Code);
    }

    [Fact]
    public void EnsureBeforePhotoValid_WhenThereIsNoPhoto_ThrowsPhotoRequired()
    {
        var spa = Spa(AppointmentStatus.Received);

        var ex = Assert.Throws<BusinessException>(() => spa.EnsureBeforePhotoValid(null, 7, StartedAt));

        Assert.Equal(ErrorCodes.PhotoRequired, ex.Code);
    }

    [Fact]
    public void EnsureBeforePhotoValid_UsesTheConfiguredValidityDays()
    {
        var spa = Spa(AppointmentStatus.Received);
        var fourDaysAgo = StartedAt.AddDays(-4);

        spa.EnsureBeforePhotoValid(fourDaysAgo, 30, StartedAt);

        var ex = Assert.Throws<BusinessException>(() => spa.EnsureBeforePhotoValid(fourDaysAgo, 3, StartedAt));
        Assert.Equal(ErrorCodes.PhotoRequired, ex.Code);
    }

    [Fact]
    public void StartWithValidBeforePhoto_WhenReceivedAndPhotoIsValid_MovesToInProgress()
    {
        var spa = Spa(AppointmentStatus.Received);

        spa.StartWithValidBeforePhoto(StartedAt.AddHours(-1), 7, StartedAt);

        Assert.Equal(AppointmentStatus.InProgress, spa.Status);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void StartWithValidBeforePhoto_WhenPhotoIsMissingOrStale_ThrowsPhotoRequiredAndKeepsStatus(bool stale)
    {
        var spa = Spa(AppointmentStatus.Received);
        DateTimeOffset? uploadedAt = stale ? StartedAt.AddDays(-8) : null;

        var ex = Assert.Throws<BusinessException>(() => spa.StartWithValidBeforePhoto(uploadedAt, 7, StartedAt));

        Assert.Equal(ErrorCodes.PhotoRequired, ex.Code);
        Assert.Equal(AppointmentStatus.Received, spa.Status);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.InStay)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void StartWithValidBeforePhoto_WhenStatusIsNotReceived_ThrowsInvalidTransitionBeforeCheckingPhoto(
        AppointmentStatus status)
    {
        var spa = Spa(status);

        var ex = Assert.Throws<BusinessException>(() => spa.StartWithValidBeforePhoto(null, 7, StartedAt));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, spa.Status);
    }

    [Fact]
    public void EnsureAfterPhotoPresent_WhenPhotoExists_DoesNotThrow()
    {
        Spa(AppointmentStatus.InProgress).EnsureAfterPhotoPresent(true);
    }

    [Fact]
    public void EnsureAfterPhotoPresent_WhenNoPhoto_ThrowsPhotoRequired()
    {
        var spa = Spa(AppointmentStatus.InProgress);

        var ex = Assert.Throws<BusinessException>(() => spa.EnsureAfterPhotoPresent(false));

        Assert.Equal(ErrorCodes.PhotoRequired, ex.Code);
    }
}
