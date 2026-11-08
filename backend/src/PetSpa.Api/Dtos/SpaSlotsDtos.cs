using System.Globalization;
using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed class SpaSlotsQuery
{
    public DateOnly? Date { get; init; }
    public Guid? PetId { get; init; }
    public string? ServiceIds { get; init; }

    public static List<Guid>? ParseServiceIds(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;

        var ids = new List<Guid>();
        foreach (var part in raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!Guid.TryParse(part, out var id) || id == Guid.Empty) return null;
            ids.Add(id);
        }

        return ids.Count > 0 ? ids : null;
    }
}

public sealed record SpaSlotResponse(string Time, SlotGroup Group, SlotStatus Status);

public sealed record SpaSlotsResponse(
    int DurationMinutes,
    int StaffRequired,
    int BufferMinutes,
    IReadOnlyList<SpaSlotResponse> Slots)
{
    public static SpaSlotsResponse From(SpaSlotsResult result) => new(
        result.DurationMinutes,
        result.StaffRequired,
        result.BufferMinutes,
        result.Slots
            .Select(x => new SpaSlotResponse(x.Time.ToString("HH:mm", CultureInfo.InvariantCulture), x.Group, x.Status))
            .ToList());
}

