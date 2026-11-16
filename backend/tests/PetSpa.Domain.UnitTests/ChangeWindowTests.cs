using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class ChangeWindowTests
{
    private static readonly DateTimeOffset Now = new(2026, 12, 1, 0, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(60, 61, true)]
    [InlineData(60, 60, true)]
    [InlineData(60, 59, false)]
    [InlineData(120, 119, false)]
    [InlineData(120, 120, true)]
    [InlineData(120, 180, true)]
    public void IsOpen_UsesConfiguredDeadlineMinutes(int deadlineMinutes, int minutesBeforeStart, bool expected)
    {
        Assert.Equal(expected, ChangeWindow.IsOpen(Now.AddMinutes(minutesBeforeStart), Now, deadlineMinutes));
    }

    [Fact]
    public void IsOpen_OneSecondShortOfDeadline_IsClosed()
    {
        Assert.False(ChangeWindow.IsOpen(Now.AddMinutes(60).AddSeconds(-1), Now, 60));
    }

    [Fact]
    public void IsOpen_WhenStartAlreadyPassed_IsClosed()
    {
        Assert.False(ChangeWindow.IsOpen(Now.AddMinutes(-5), Now, 60));
    }

    [Fact]
    public void EnsureOpen_WhenClosed_ThrowsChangeWindowClosed()
    {
        var ex = Assert.Throws<BusinessException>(() => ChangeWindow.EnsureOpen(Now.AddMinutes(30), Now, 60));
        Assert.Equal(ErrorCodes.ChangeWindowClosed, ex.Code);
    }

    [Fact]
    public void EnsureOpen_WhenOpen_DoesNotThrow()
    {
        ChangeWindow.EnsureOpen(Now.AddMinutes(60), Now, 60);
    }
}
