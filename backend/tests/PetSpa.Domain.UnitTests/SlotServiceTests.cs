using PetSpa.Domain.Enums;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class SlotServiceTests
{
    private const int Buffer = 15;
    private static readonly TimeOnly Latest = new(18, 0);

    private static DateTimeOffset At(int hour, int minute = 0) =>
        new(2026, 11, 10, hour, minute, 0, TimeSpan.Zero);

    private static SlotCandidate Slot(int hour) => new(new TimeOnly(hour, 0), At(hour));

    private static List<SlotStaffShift> AllDayShifts(int staffCount) =>
        Enumerable.Range(0, staffCount)
            .Select(_ => new SlotStaffShift(Guid.NewGuid(), At(8), At(22)))
            .ToList();

    private static SlotHeldBooking Held(
        int fromHour, int fromMinute, int toHour, int toMinute, int staffRequired = 1) =>
        new(At(fromHour, fromMinute), At(toHour, toMinute), staffRequired);

    private static SlotStatus StatusOf(
        int slotHour,
        int durationMinutes,
        int staffRequired,
        IReadOnlyList<SlotStaffShift> shifts,
        IReadOnlyList<SlotHeldBooking> held) =>
        SlotService.AvailableSlots(
            [Slot(slotHour)], Latest, durationMinutes, staffRequired, Buffer, shifts, held)[0].Status;

    [Fact]
    public void RequiredStaff_TakesLargestOfServices()
    {
        Assert.Equal(2, SlotService.RequiredStaff([1, 2], Temperament.Normal));
        Assert.Equal(1, SlotService.RequiredStaff([1, 1], Temperament.Calm));
    }

    [Fact]
    public void RequiredStaff_DifficultPet_AtLeastTwo()
    {
        Assert.Equal(2, SlotService.RequiredStaff([1], Temperament.Difficult));
        Assert.Equal(2, SlotService.RequiredStaff([2], Temperament.Difficult));
    }

    [Theory]
    [InlineData(9, SlotGroup.Morning)]
    [InlineData(11, SlotGroup.Morning)]
    [InlineData(12, SlotGroup.Afternoon)]
    [InlineData(14, SlotGroup.Afternoon)]
    [InlineData(15, SlotGroup.Evening)]
    [InlineData(19, SlotGroup.Evening)]
    public void GroupOf_SplitsMorningAfternoonEvening(int hour, SlotGroup expected)
    {
        Assert.Equal(expected, SlotService.GroupOf(new TimeOnly(hour, 0)));
    }

    [Fact]
    public void Slot_AfterLatestStart_IsNotAccepted_EvenWhenStaffIsFree()
    {
        Assert.Equal(SlotStatus.NotAccepted, StatusOf(19, 60, 1, AllDayShifts(3), []));
    }

    [Fact]
    public void Slot_AtLatestStart_IsStillAccepted()
    {
        Assert.Equal(SlotStatus.Available, StatusOf(18, 60, 1, AllDayShifts(1), []));
    }

    [Fact]
    public void Slot_WithEnoughStaffAndNoBookings_IsAvailable()
    {
        Assert.Equal(SlotStatus.Available, StatusOf(10, 120, 1, AllDayShifts(1), []));
    }

    [Fact]
    public void Slot_WithoutAnyShift_IsFull()
    {
        Assert.Equal(SlotStatus.Full, StatusOf(10, 120, 1, [], []));
    }

    [Fact]
    public void Slots_AllStaffBusy_BecomeAvailableAfterBusyUntil()
    {
        var held = new List<SlotHeldBooking>
        {
            Held(9, 0, 11, 15),
            Held(9, 0, 11, 15),
            Held(9, 0, 11, 15),
        };

        var result = SlotService.AvailableSlots(
            [Slot(10), Slot(11), Slot(12)], Latest, 120, 1, Buffer, AllDayShifts(3), held);

        Assert.Equal(
            new[] { SlotStatus.Full, SlotStatus.Full, SlotStatus.Available },
            result.Select(r => r.Status).ToArray());
    }

    [Fact]
    public void Slot_ShiftNotCoveringWholeBusyRange_DoesNotCountStaff()
    {
        var shifts = new List<SlotStaffShift> { new(Guid.NewGuid(), At(8), At(11)) };

        Assert.Equal(SlotStatus.Full, StatusOf(10, 120, 1, shifts, []));
    }

    [Fact]
    public void Slot_PeakLoadIsMaximumAtOneMoment_NotSumOfAllBookings()
    {
        var held = new List<SlotHeldBooking> { Held(9, 0, 10, 15), Held(10, 15, 12, 0) };

        Assert.Equal(SlotStatus.Available, StatusOf(9, 180, 1, AllDayShifts(2), held));
    }

    [Fact]
    public void Slot_NeedingTwoStaff_IsFullWhenOnlyOneIsFree()
    {
        var shifts = AllDayShifts(2);
        var held = new List<SlotHeldBooking> { Held(10, 0, 12, 15) };

        Assert.Equal(SlotStatus.Full, StatusOf(10, 120, 2, shifts, held));
        Assert.Equal(SlotStatus.Available, StatusOf(10, 120, 1, shifts, held));
    }

    private static readonly DateTimeOffset HoldStart = At(10);
    private static readonly DateTimeOffset HoldEnd = At(12, 15);

    private static SlotStaffCandidate Candidate(string name) => new(Guid.NewGuid(), name);

    private static SlotStaffShift ShiftOf(SlotStaffCandidate c, int fromHour, int toHour) =>
        new(c.StaffId, At(fromHour), At(toHour));

    private static SlotStaffBusy BusyOf(
        SlotStaffCandidate c, int fromHour, int fromMinute, int toHour, int toMinute) =>
        new(c.StaffId, At(fromHour, fromMinute), At(toHour, toMinute));

    private static string[] NamesOf(IReadOnlyList<SlotStaffCandidate> list) =>
        list.Select(x => x.FullName).ToArray();

    [Fact]
    public void AvailableStaff_OnlyStaffWhoseShiftCoversWholeHoldRange()
    {
        var covered = Candidate("An");
        var shortShift = Candidate("Binh");
        var noShift = Candidate("Chi");

        var result = SlotService.AvailableStaff(
            [covered, shortShift, noShift],
            [ShiftOf(covered, 8, 22), ShiftOf(shortShift, 8, 11)],
            [],
            HoldStart,
            HoldEnd);

        Assert.Equal(new[] { "An" }, NamesOf(result));
    }

    [Fact]
    public void AvailableStaff_ShiftExactlyEqualToHoldRange_IsCovered()
    {
        var staff = Candidate("An");

        var result = SlotService.AvailableStaff(
            [staff], [new SlotStaffShift(staff.StaffId, HoldStart, HoldEnd)], [], HoldStart, HoldEnd);

        Assert.Equal(new[] { "An" }, NamesOf(result));
    }

    [Fact]
    public void AvailableStaff_StaffWithOverlappingHold_IsExcluded()
    {
        var busy = Candidate("An");
        var free = Candidate("Binh");

        var result = SlotService.AvailableStaff(
            [busy, free],
            [ShiftOf(busy, 8, 22), ShiftOf(free, 8, 22)],
            [BusyOf(busy, 11, 0, 13, 0)],
            HoldStart,
            HoldEnd);

        Assert.Equal(new[] { "Binh" }, NamesOf(result));
    }

    [Fact]
    public void AvailableStaff_HoldsTouchingTheRangeBoundaries_DoNotOverlap()
    {
        var before = Candidate("An");
        var after = Candidate("Binh");

        var result = SlotService.AvailableStaff(
            [before, after],
            [ShiftOf(before, 8, 22), ShiftOf(after, 8, 22)],
            [BusyOf(before, 8, 0, 10, 0), BusyOf(after, 12, 15, 14, 0)],
            HoldStart,
            HoldEnd);

        Assert.Equal(new[] { "An", "Binh" }, NamesOf(result));
    }

    [Fact]
    public void AvailableStaff_HoldOfAnotherStaff_DoesNotExcludeThisStaff()
    {
        var an = Candidate("An");
        var binh = Candidate("Binh");

        var result = SlotService.AvailableStaff(
            [an],
            [ShiftOf(an, 8, 22)],
            [BusyOf(binh, 10, 0, 12, 15)],
            HoldStart,
            HoldEnd);

        Assert.Equal(new[] { "An" }, NamesOf(result));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    public void AvailableStaff_WhenHoldStartNotBeforeHoldEnd_ThrowsArgumentException(int minutesDelta)
    {
        var staff = Candidate("An");
        var start = HoldStart;
        var end = start.AddMinutes(-minutesDelta);

        var ex = Assert.Throws<ArgumentException>(() =>
            SlotService.AvailableStaff([staff], [ShiftOf(staff, 8, 22)], [], start, end));

        Assert.Contains("holdStart phải nhỏ hơn holdEnd", ex.Message);
    }

    [Fact]
    public void AvailableStaff_WhenCandidatesNull_ThrowsArgumentNullException()
    {
        Assert.Throws<ArgumentNullException>(() =>
            SlotService.AvailableStaff(null!, [], [], HoldStart, HoldEnd));
    }
}

