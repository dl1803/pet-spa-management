using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Services;

public sealed record SlotCandidate(TimeOnly Time, DateTimeOffset Start);

public sealed record SlotResult(TimeOnly Time, SlotStatus Status);

public sealed record SlotStaffShift(Guid StaffId, DateTimeOffset Start, DateTimeOffset End);

public sealed record SlotHeldBooking(DateTimeOffset Start, DateTimeOffset BusyUntil, int StaffRequired);

public static class SlotService
{
    private static readonly TimeOnly AfternoonStart = new(12, 0);
    private static readonly TimeOnly EveningStart = new(15, 0);

    public static int RequiredStaff(IEnumerable<int> serviceStaffRequired, Temperament temperament)
    {
        var required = serviceStaffRequired.Max();
        return temperament == Temperament.Difficult ? Math.Max(required, 2) : required;
    }

    public static SlotGroup GroupOf(TimeOnly time)
    {
        if (time < AfternoonStart) return SlotGroup.Morning;
        if (time < EveningStart) return SlotGroup.Afternoon;
        return SlotGroup.Evening;
    }

    public static IReadOnlyList<SlotResult> AvailableSlots(
        IReadOnlyList<SlotCandidate> candidates,
        TimeOnly latestStart,
        int durationMinutes,
        int staffRequired,
        int bufferMinutes,
        IReadOnlyList<SlotStaffShift> shifts,
        IReadOnlyList<SlotHeldBooking> held)
    {
        var results = new List<SlotResult>(candidates.Count);

        foreach (var slot in candidates)
        {
            if (slot.Time > latestStart)
            {
                results.Add(new SlotResult(slot.Time, SlotStatus.NotAccepted));
                continue;
            }

            var end = slot.Start.AddMinutes(durationMinutes + bufferMinutes);

            var staffAvailable = shifts
                .Where(s => s.Start <= slot.Start && s.End >= end)
                .Select(s => s.StaffId)
                .Distinct()
                .Count();

            var free = staffAvailable - PeakLoad(held, slot.Start, end);
            results.Add(new SlotResult(slot.Time, free >= staffRequired ? SlotStatus.Available : SlotStatus.Full));
        }

        return results;
    }

    private static int PeakLoad(IReadOnlyList<SlotHeldBooking> held, DateTimeOffset from, DateTimeOffset to)
    {
        var overlapping = held.Where(h => h.Start < to && h.BusyUntil > from).ToList();
        if (overlapping.Count == 0) return 0;

        return overlapping
            .Select(h => h.Start)
            .Where(t => t > from)
            .Append(from)
            .Max(t => overlapping.Where(h => h.Start <= t && t < h.BusyUntil).Sum(h => h.StaffRequired));
    }
}

