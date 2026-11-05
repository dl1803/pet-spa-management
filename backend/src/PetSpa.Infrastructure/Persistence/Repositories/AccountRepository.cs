using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Infrastructure.Identity;

namespace PetSpa.Infrastructure.Persistence.Repositories;

// Adapter của IAccountRepository. Thao tác chạm cả AppUser và Customer chạy trong một giao dịch (X-02).
// Email chỉ lưu ở Customer.Email; AppUser.Email không dùng (DatabaseDesign 3.1).
public sealed class AccountRepository(UserManager<AppUser> userManager, AppDbContext db) : IAccountRepository
{
    public async Task<Guid> CreateCustomerAccountAsync(
        string phone, string fullName, string? email, string password, CancellationToken ct = default)
    {
        if (await db.Set<Customer>().AnyAsync(c => c.Phone == phone, ct))
            throw new BusinessException(ErrorCodes.DuplicateContact);

        var user = new AppUser { Id = Guid.NewGuid(), UserName = phone, Role = UserRole.Customer };

        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);

            var result = await userManager.CreateAsync(user, password);
            if (!result.Succeeded) throw ToBusinessException(result);

            db.Set<Customer>().Add(new Customer
            {
                CustomerId = Guid.NewGuid(),
                UserId = user.Id,
                FullName = fullName,
                Phone = phone,
                Email = email,
            });
            await db.SaveChangesAsync(ct);

            await transaction.CommitAsync(ct);
            return user.Id;
        }
        // Hai request cùng đăng ký một số: ràng buộc UNIQUE của CSDL là chốt cuối.
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new BusinessException(ErrorCodes.DuplicateContact);
        }
    }

    public async Task<MeProfile?> GetMeAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return null;

        switch (user.Role)
        {
            case UserRole.Customer:
                var customer = await db.Set<Customer>().AsNoTracking()
                    .FirstOrDefaultAsync(c => c.UserId == userId, ct);
                return new MeProfile(user.Id, user.UserName!, user.Role, null,
                    customer?.FullName, customer?.Phone, customer?.Email);

            case UserRole.Staff:
                var staff = await db.Set<Staff>().AsNoTracking()
                    .FirstOrDefaultAsync(s => s.UserId == userId, ct);
                return new MeProfile(user.Id, user.UserName!, user.Role, staff?.StaffRole,
                    staff?.FullName, null, null);

            default:
                return new MeProfile(user.Id, user.UserName!, user.Role, null, null, null, null);
        }
    }

    public async Task UpdateCustomerProfileAsync(
        Guid userId, string fullName, string? phone, string? email, CancellationToken ct = default)
    {
        var customer = await db.Set<Customer>().FirstOrDefaultAsync(c => c.UserId == userId, ct)
            ?? throw new BusinessException(ErrorCodes.Forbidden);

        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);

            if (phone is not null && phone != customer.Phone)
            {
                if (await db.Set<Customer>().AnyAsync(c => c.Phone == phone, ct))
                    throw new BusinessException(ErrorCodes.DuplicateContact);

                var user = await userManager.FindByIdAsync(userId.ToString())
                    ?? throw new BusinessException(ErrorCodes.Unauthenticated);
                var result = await userManager.SetUserNameAsync(user, phone);
                if (!result.Succeeded) throw ToBusinessException(result);

                customer.Phone = phone;
            }

            customer.FullName = fullName;
            customer.Email = email;
            await db.SaveChangesAsync(ct);

            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new BusinessException(ErrorCodes.DuplicateContact);
        }
    }

    public async Task UpdateStaffFullNameAsync(Guid userId, string fullName, CancellationToken ct = default)
    {
        var staff = await db.Set<Staff>().FirstOrDefaultAsync(s => s.UserId == userId, ct)
            ?? throw new BusinessException(ErrorCodes.Forbidden);

        staff.FullName = fullName;
        await db.SaveChangesAsync(ct);
    }

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
