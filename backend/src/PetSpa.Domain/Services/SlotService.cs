using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Services;

public sealed record SlotCandidate(TimeOnly Time, DateTimeOffset Start);

public sealed record SlotResult(TimeOnly Time, SlotStatus Status);

public sealed record SlotStaffShift(Guid StaffId, DateTimeOffset Start, DateTimeOffset End);

public sealed record SlotHeldBooking(DateTimeOffset Start, DateTimeOffset BusyUntil, int StaffRequired);

public sealed record SlotStaffCandidate(Guid StaffId, string FullName);

public sealed record SlotStaffBusy(Guid StaffId, DateTimeOffset Start, DateTimeOffset BusyUntil);

public sealed record SlotStaffSuggestion(Guid StaffId, string FullName, int RecentAssignmentCount);

public sealed record SlotStaffSuggestions(
    IReadOnlyList<SlotStaffSuggestion> Suggested,
    IReadOnlyList<SlotStaffSuggestion> Alternatives);

public sealed record SlotHeldStay(DateOnly CheckInDate, DateOnly CheckOutDate);

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

    public static IReadOnlyList<SlotStaffCandidate> AvailableStaff(
        IReadOnlyList<SlotStaffCandidate> candidates,
        IReadOnlyList<SlotStaffShift> shifts,
        IReadOnlyList<SlotStaffBusy> busy,
        DateTimeOffset holdStart,
        DateTimeOffset holdEnd)
    {
        ArgumentNullException.ThrowIfNull(candidates);
        ArgumentNullException.ThrowIfNull(shifts);
        ArgumentNullException.ThrowIfNull(busy);

        if (holdStart >= holdEnd)
            throw new ArgumentException("holdStart phải nhỏ hơn holdEnd.");

        return candidates
            .Where(c => shifts.Any(s => s.StaffId == c.StaffId && s.Start <= holdStart && s.End >= holdEnd))
            .Where(c => !busy.Any(b => b.StaffId == c.StaffId && b.Start < holdEnd && b.BusyUntil > holdStart))
            .ToList();
    }

    public static SlotStaffSuggestions SuggestStaff(
        IReadOnlyList<SlotStaffCandidate> available,
        IReadOnlyDictionary<Guid, int> recentAssignmentCounts,
        int staffRequired)
    {
        ArgumentNullException.ThrowIfNull(available);
        ArgumentNullException.ThrowIfNull(recentAssignmentCounts);

        if (staffRequired < 1)
            throw new ArgumentOutOfRangeException(nameof(staffRequired), "staffRequired phải lớn hơn 0.");

        var ranked = available
            .Select(c => new SlotStaffSuggestion(
                c.StaffId, c.FullName, recentAssignmentCounts.GetValueOrDefault(c.StaffId)))
            .OrderBy(s => s.RecentAssignmentCount)
            .ThenBy(s => s.FullName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(s => s.StaffId)
            .ToList();

        return new SlotStaffSuggestions(
            ranked.Take(staffRequired).ToList(),
            ranked.Skip(staffRequired).ToList());
    }

    public static int AvailableCages(
        int activeCages,
        IReadOnlyList<SlotHeldStay> heldStays,
        DateOnly checkInDate,
        DateOnly checkOutDate)
    {
        ArgumentNullException.ThrowIfNull(heldStays);

        if (checkOutDate <= checkInDate)
            throw new ArgumentException("Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.");

        var available = activeCages;
        for (var night = checkInDate; night < checkOutDate; night = night.AddDays(1))
        {
            var occupied = heldStays.Count(s => s.CheckInDate <= night && night < s.CheckOutDate);
            available = Math.Min(available, activeCages - occupied);
        }

        return Math.Max(available, 0);
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

