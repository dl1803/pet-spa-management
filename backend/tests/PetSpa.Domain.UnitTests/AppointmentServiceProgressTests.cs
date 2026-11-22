using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AppointmentServiceProgressTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 22, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void EnsureServiceProgressAllowed_WhenInProgress_DoesNotThrow()
    {
        new SpaAppointment { Status = AppointmentStatus.InProgress }.EnsureServiceProgressAllowed();
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void EnsureServiceProgressAllowed_WhenNotInProgress_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var spa = new SpaAppointment { Status = status };

        var ex = Assert.Throws<BusinessException>(() => spa.EnsureServiceProgressAllowed());

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
    }

    [Fact]
    public void SetProgress_WhenMarkedDone_SetsDoneAtAndNote()
    {
        var line = new AppointmentService();

        line.SetProgress(true, "  Đã tắm xong  ", Now);

        Assert.True(line.IsDone);
        Assert.Equal(Now, line.DoneAt);
        Assert.Equal("Đã tắm xong", line.Note);
    }

    [Fact]
    public void SetProgress_WhenAlreadyDone_KeepsOriginalDoneAt()
    {
        var line = new AppointmentService { IsDone = true, DoneAt = Now.AddHours(-1) };

        line.SetProgress(true, null, Now);

        Assert.Equal(Now.AddHours(-1), line.DoneAt);
    }

    [Fact]
    public void SetProgress_WhenUnmarked_ClearsDoneAt()
    {
        var line = new AppointmentService { IsDone = true, DoneAt = Now };

        line.SetProgress(false, null, Now.AddMinutes(5));

        Assert.False(line.IsDone);
        Assert.Null(line.DoneAt);
    }

    [Fact]
    public void SetProgress_WhenNoteIsNull_KeepsExistingNote()
    {
        var line = new AppointmentService { Note = "Lông rối" };

        line.SetProgress(true, null, Now);

        Assert.Equal("Lông rối", line.Note);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void SetProgress_WhenNoteIsBlank_ClearsNote(string note)
    {
        var line = new AppointmentService { Note = "Lông rối" };

        line.SetProgress(true, note, Now);

        Assert.Null(line.Note);
    }
}
