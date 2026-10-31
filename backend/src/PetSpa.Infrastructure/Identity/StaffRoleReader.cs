using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Infrastructure.Persistence;

namespace PetSpa.Infrastructure.Identity;

// Adapter của IStaffRoleReader: một truy vấn theo Staff.UserId (có chỉ mục duy nhất).
public sealed class StaffRoleReader(AppDbContext db) : IStaffRoleReader
{
    public async Task<StaffRole?> GetStaffRoleAsync(Guid userId, CancellationToken ct = default)
    {
        var staff = await db.Set<Staff>().AsNoTracking().FirstOrDefaultAsync(s => s.UserId == userId, ct);
        return staff?.StaffRole;
    }
}
