using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class AppointmentProgressRepository(AppDbContext db) : IAppointmentProgressRepository
{
    public Task<AppointmentService?> FindServiceLineAsync(Guid appointmentId, Guid serviceId, CancellationToken ct = default) =>
        db.Set<AppointmentService>()
            .FirstOrDefaultAsync(s => s.AppointmentId == appointmentId && s.ServiceId == serviceId, ct);

    public async Task<IReadOnlyList<AppointmentService>> ListServiceLinesAsync(Guid appointmentId, CancellationToken ct = default)
    {
        return await db.Set<AppointmentService>()
            .AsNoTracking()
            .Where(s => s.AppointmentId == appointmentId)
            .ToListAsync(ct);
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}
