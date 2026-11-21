using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class CostConfirmationRepository(AppDbContext db) : ICostConfirmationRepository
{
    public async Task<int> GetTimeoutMinutesAsync(CancellationToken ct = default)
    {
        const int defaultTimeoutMinutes = 30;

        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "CostConfirm.TimeoutMinutes")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var minutes) && minutes > 0
            ? minutes
            : defaultTimeoutMinutes;
    }

    public Task<bool> HasPendingAsync(Guid appointmentId, CancellationToken ct = default) =>
        db.Set<CostConfirmation>().AsNoTracking()
            .AnyAsync(c => c.AppointmentId == appointmentId && c.Status == ConfirmationStatus.Pending, ct);

    public void Add(CostConfirmation confirmation) =>
        db.Set<CostConfirmation>().Add(confirmation);
}

