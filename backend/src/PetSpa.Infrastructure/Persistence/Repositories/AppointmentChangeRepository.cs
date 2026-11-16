using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class AppointmentChangeRepository(AppDbContext db) : IAppointmentChangeRepository
{
    public async Task<int> GetChangeCancelDeadlineMinutesAsync(CancellationToken ct = default)
    {
        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "Booking.ChangeCancelDeadlineMinutes")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        if (value is null)
            throw new InvalidOperationException("Thiếu cấu hình Booking.ChangeCancelDeadlineMinutes.");

        if (!int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var minutes) || minutes <= 0)
            throw new InvalidOperationException(
                "Cấu hình Booking.ChangeCancelDeadlineMinutes phải là số phút nguyên dương.");

        return minutes;
    }
}
