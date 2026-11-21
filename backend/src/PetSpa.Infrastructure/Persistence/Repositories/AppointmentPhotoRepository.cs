using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class AppointmentPhotoRepository(AppDbContext db) : IAppointmentPhotoRepository
{
    public Task<Guid?> FindSpaStaffIdByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        db.Set<Staff>()
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.StaffRole == StaffRole.SpaStaff)
            .Select(s => (Guid?)s.StaffId)
            .FirstOrDefaultAsync(ct);

    public async Task AddAsync(AppointmentPhoto photo, CancellationToken ct = default)
    {
        db.Set<AppointmentPhoto>().Add(photo);
        await db.SaveChangesAsync(ct);
    }
}
