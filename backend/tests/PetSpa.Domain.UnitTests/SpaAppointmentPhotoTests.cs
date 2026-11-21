using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class SpaAppointmentPhotoTests
{
    private static SpaAppointment Spa(AppointmentStatus status) => new()
    {
        AppointmentId = Guid.NewGuid(),
        Status = status,
    };

    [Theory]
    [InlineData(PhotoKind.Before, AppointmentStatus.Received)]
    [InlineData(PhotoKind.After, AppointmentStatus.InProgress)]
    public void EnsurePhotoAllowed_WhenStatusMatchesKind_DoesNotThrowAndKeepsStatus(PhotoKind kind, AppointmentStatus status)
    {
        var spa = Spa(status);

        spa.EnsurePhotoAllowed(kind);

        Assert.Equal(status, spa.Status);
    }

    [Theory]
    [InlineData(PhotoKind.Before, AppointmentStatus.Pending)]
    [InlineData(PhotoKind.Before, AppointmentStatus.Confirmed)]
    [InlineData(PhotoKind.Before, AppointmentStatus.InProgress)]
    [InlineData(PhotoKind.Before, AppointmentStatus.InStay)]
    [InlineData(PhotoKind.Before, AppointmentStatus.Completed)]
    [InlineData(PhotoKind.Before, AppointmentStatus.Cancelled)]
    [InlineData(PhotoKind.After, AppointmentStatus.Pending)]
    [InlineData(PhotoKind.After, AppointmentStatus.Confirmed)]
    [InlineData(PhotoKind.After, AppointmentStatus.Received)]
    [InlineData(PhotoKind.After, AppointmentStatus.InStay)]
    [InlineData(PhotoKind.After, AppointmentStatus.Completed)]
    [InlineData(PhotoKind.After, AppointmentStatus.Cancelled)]
    public void EnsurePhotoAllowed_WhenStatusDoesNotMatchKind_ThrowsInvalidTransition(PhotoKind kind, AppointmentStatus status)
    {
        var spa = Spa(status);

        var ex = Assert.Throws<BusinessException>(() => spa.EnsurePhotoAllowed(kind));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, spa.Status);
    }

    [Fact]
    public void EnsurePhotoAllowed_WhenKindIsUndefined_ThrowsValidationError()
    {
        var spa = Spa(AppointmentStatus.Received);

        var ex = Assert.Throws<BusinessException>(() => spa.EnsurePhotoAllowed((PhotoKind)99));

        Assert.Equal(ErrorCodes.ValidationError, ex.Code);
    }
}
