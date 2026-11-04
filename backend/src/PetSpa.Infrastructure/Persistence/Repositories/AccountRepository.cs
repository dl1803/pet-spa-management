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

