using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Infrastructure.Identity;

namespace PetSpa.Infrastructure.Persistence.Repositories;

// Adapter của IStaffRepository. Thao tác chạm cả AppUser và Staff chạy trong một giao dịch.
// Số điện thoại là AppUser.UserName (SA 4.2.4); bảng Staff không có cột số điện thoại.
public sealed class StaffRepository(UserManager<AppUser> userManager, AppDbContext db) : IStaffRepository
{
    public async Task<Guid> CreateAsync(
        string phone, string fullName, StaffRole staffRole, string password, CancellationToken ct = default)
    {
        // Role luôn là Staff, IsActive mặc định true: không nhận từ client.
        var user = new AppUser { Id = Guid.NewGuid(), UserName = phone, Role = UserRole.Staff };

        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);

            var result = await userManager.CreateAsync(user, password);
            if (!result.Succeeded) throw ToBusinessException(result);

            var staff = new Staff
            {
                StaffId = Guid.NewGuid(),
                UserId = user.Id,
                FullName = fullName,
                StaffRole = staffRole,
            };
            db.Set<Staff>().Add(staff);
            await db.SaveChangesAsync(ct);

            await transaction.CommitAsync(ct);
            return staff.StaffId;
        }
        // Hai request cùng tạo một số: ràng buộc UNIQUE của CSDL là chốt cuối.
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new BusinessException(ErrorCodes.DuplicateContact);
        }
    }

    public async Task<PagedResult<StaffSummary>> ListAsync(int page, int pageSize, CancellationToken ct = default)
    {
        // Số điện thoại và trạng thái hoạt động nằm ở AppUser nên phải nối với bảng Staff.
        var query = from s in db.Set<Staff>().AsNoTracking()
                    join u in db.Users.AsNoTracking() on s.UserId equals u.Id
                    select new { s.StaffId, u.UserName, s.FullName, s.StaffRole, u.IsActive };

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderBy(x => x.FullName).ThenBy(x => x.StaffId)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);

        var items = rows
            .Select(x => new StaffSummary(x.StaffId, x.UserName!, x.FullName, x.StaffRole, x.IsActive))
            .ToList();

        return new PagedResult<StaffSummary>(items, page, pageSize, total);
    }

    public async Task UpdateAsync(Guid staffId, string fullName, StaffRole staffRole, CancellationToken ct = default)
    {
        var staff = await db.Set<Staff>().FirstOrDefaultAsync(s => s.StaffId == staffId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        staff.FullName = fullName;
        staff.StaffRole = staffRole;
        await db.SaveChangesAsync(ct);
    }

    // Hai hàm dưới giống AccountRepository (ID 62); không sửa AccountRepository để tách dùng chung vì ngoài phạm vi ID 63.
    private static BusinessException ToBusinessException(IdentityResult result)
    {
        if (result.Errors.Any(e => e.Code == "DuplicateUserName"))
            return new BusinessException(ErrorCodes.DuplicateContact);

        if (result.Errors.Any(e => e.Code.StartsWith("Password", StringComparison.Ordinal)))
            return new BusinessException(ErrorCodes.ValidationError,
                "Mật khẩu chưa đạt yêu cầu: tối thiểu 6 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.");

        return new BusinessException(ErrorCodes.ValidationError);
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}
