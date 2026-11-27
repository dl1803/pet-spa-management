using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class CostConfirmationTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 20, 9, 0, 0, TimeSpan.Zero);

    private static CostConfirmation Confirmation(ConfirmationStatus status = ConfirmationStatus.Pending) => new()
    {
        ConfirmationId = Guid.NewGuid(),
        AppointmentId = Guid.NewGuid(),
        ActualWeightKg = 3.4m,
        NewSizeGroup = SizeGroup.Medium,
        OldAmount = 100000m,
        NewAmount = 150000m,
        Status = status,
        CreatedAt = Now,
        ExpiresAt = Now.AddMinutes(30),
    };

    [Fact]
    public void Accept_WhenPendingAndNotExpired_SetsAcceptedAndResponder()
    {
        var confirmation = Confirmation();
        var userId = Guid.NewGuid();
        var respondedAt = Now.AddMinutes(10);

        confirmation.Accept(userId, respondedAt);

        Assert.Equal(ConfirmationStatus.Accepted, confirmation.Status);
        Assert.Equal(userId, confirmation.RespondedByUserId);
        Assert.Equal(respondedAt, confirmation.RespondedAt);
    }

    [Fact]
    public void Reject_WhenPendingAndNotExpired_SetsRejectedAndResponder()
    {
        var confirmation = Confirmation();
        var userId = Guid.NewGuid();
        var respondedAt = Now.AddMinutes(10);

        confirmation.Reject(userId, respondedAt);

        Assert.Equal(ConfirmationStatus.Rejected, confirmation.Status);
        Assert.Equal(userId, confirmation.RespondedByUserId);
        Assert.Equal(respondedAt, confirmation.RespondedAt);
    }

    [Fact]
    public void Accept_AtExactlyExpiresAt_IsStillAllowed()
    {
        var confirmation = Confirmation();

        confirmation.Accept(Guid.NewGuid(), confirmation.ExpiresAt);

        Assert.Equal(ConfirmationStatus.Accepted, confirmation.Status);
    }

    [Fact]
    public void Accept_WhenExpired_ThrowsExpiredAndKeepsPending()
    {
        var confirmation = Confirmation();

        var ex = Assert.Throws<BusinessException>(
            () => confirmation.Accept(Guid.NewGuid(), confirmation.ExpiresAt.AddSeconds(1)));

        Assert.Equal(ErrorCodes.CostConfirmationExpired, ex.Code);
        Assert.Equal(ConfirmationStatus.Pending, confirmation.Status);
        Assert.Null(confirmation.RespondedAt);
        Assert.Null(confirmation.RespondedByUserId);
    }

    [Fact]
    public void Reject_WhenExpired_ThrowsExpiredAndKeepsPending()
    {
        var confirmation = Confirmation();

        var ex = Assert.Throws<BusinessException>(
            () => confirmation.Reject(Guid.NewGuid(), confirmation.ExpiresAt.AddSeconds(1)));

        Assert.Equal(ErrorCodes.CostConfirmationExpired, ex.Code);
        Assert.Equal(ConfirmationStatus.Pending, confirmation.Status);
    }

    [Theory]
    [InlineData(ConfirmationStatus.Accepted)]
    [InlineData(ConfirmationStatus.Rejected)]
    [InlineData(ConfirmationStatus.Expired)]
    public void Accept_WhenNotPending_ThrowsInvalidTransitionAndKeepsStatus(ConfirmationStatus status)
    {
        var confirmation = Confirmation(status);

        var ex = Assert.Throws<BusinessException>(() => confirmation.Accept(Guid.NewGuid(), Now));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, confirmation.Status);
        Assert.Null(confirmation.RespondedAt);
    }

    [Theory]
    [InlineData(ConfirmationStatus.Accepted)]
    [InlineData(ConfirmationStatus.Rejected)]
    [InlineData(ConfirmationStatus.Expired)]
    public void Reject_WhenNotPending_ThrowsInvalidTransitionAndKeepsStatus(ConfirmationStatus status)
    {
        var confirmation = Confirmation(status);

        var ex = Assert.Throws<BusinessException>(() => confirmation.Reject(Guid.NewGuid(), Now));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, confirmation.Status);
    }

    [Fact]
    public void IsOverdue_PendingAtExactlyExpiresAt_ReturnsFalse()
    {
        var confirmation = Confirmation();

        Assert.False(confirmation.IsOverdue(confirmation.ExpiresAt));
    }

    [Fact]
    public void IsOverdue_PendingPastExpiresAt_ReturnsTrue()
    {
        var confirmation = Confirmation();

        Assert.True(confirmation.IsOverdue(confirmation.ExpiresAt.AddSeconds(1)));
    }

    [Theory]
    [InlineData(ConfirmationStatus.Accepted)]
    [InlineData(ConfirmationStatus.Rejected)]
    [InlineData(ConfirmationStatus.Expired)]
    public void IsOverdue_NotPending_ReturnsFalseEvenPastExpiresAt(ConfirmationStatus status)
    {
        var confirmation = Confirmation(status);

        Assert.False(confirmation.IsOverdue(confirmation.ExpiresAt.AddHours(5)));
    }

    [Fact]
    public void Expire_PendingPastExpiresAt_SetsExpiredAndLeavesResponseEmpty()
    {
        var confirmation = Confirmation();

        confirmation.Expire(confirmation.ExpiresAt.AddSeconds(1));

        Assert.Equal(ConfirmationStatus.Expired, confirmation.Status);
        Assert.Null(confirmation.RespondedAt);
        Assert.Null(confirmation.RespondedByUserId);
    }

    [Fact]
    public void Expire_AtExactlyExpiresAt_ThrowsInvalidTransitionAndKeepsPending()
    {
        var confirmation = Confirmation();

        var ex = Assert.Throws<BusinessException>(() => confirmation.Expire(confirmation.ExpiresAt));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(ConfirmationStatus.Pending, confirmation.Status);
    }

    [Theory]
    [InlineData(ConfirmationStatus.Accepted)]
    [InlineData(ConfirmationStatus.Rejected)]
    [InlineData(ConfirmationStatus.Expired)]
    public void Expire_WhenNotPending_ThrowsInvalidTransitionAndKeepsStatus(ConfirmationStatus status)
    {
        var confirmation = Confirmation(status);

        var ex = Assert.Throws<BusinessException>(
            () => confirmation.Expire(confirmation.ExpiresAt.AddHours(5)));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, confirmation.Status);
    }
}

