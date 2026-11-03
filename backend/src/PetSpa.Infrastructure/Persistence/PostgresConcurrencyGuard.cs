using Microsoft.EntityFrameworkCore;
using Npgsql;
using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Infrastructure.Persistence;

// Adapter của IConcurrencyGuard: giao dịch EF Core, pg_advisory_xact_lock, SELECT ... FOR UPDATE (DL-06 -> DL-09).
// Dùng chung AppDbContext (scoped) với các repository trong cùng request nên mọi lệnh đều nằm trong giao dịch này.
public sealed class PostgresConcurrencyGuard(AppDbContext db) : IConcurrencyGuard
{
    // Khóa tư vấn có dạng (loại khóa, giá trị): hai loại khác nhau không bao giờ tranh nhau.
    private const int SpaDayLock = 1;
    private const int HotelGroupLock = 2;

    public async Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default)
    {
        try
        {
            // Rời khỏi khối using mà chưa Commit (do lỗi) thì giao dịch tự hoàn tác.
            await using var transaction = await db.Database.BeginTransactionAsync(ct);

            var result = await work();
            await transaction.CommitAsync(ct);
            return result;
        }
        // Ràng buộc loại trừ của CSDL là chốt cuối khi logic ứng dụng bỏ sót (BR-04, BR-21).
        catch (Exception ex) when (ToBusinessCode(ex) is { } code)
        {
            throw new BusinessException(code);
        }
    }

    public Task RunAsync(Func<Task> work, CancellationToken ct = default) =>
        RunAsync<object?>(async () =>
        {
            await work();
            return null;
        }, ct);

    public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) =>
        LockAsync(SpaDayLock, day.DayNumber, ct);

    public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
        LockAsync(HotelGroupLock, ((int)species << 8) | (int)sizeGroup, ct);

    public async Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
    {
        RequireTransaction();
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT 1 FROM \"Appointment\" WHERE \"AppointmentId\" = {appointmentId} FOR UPDATE", ct);
    }

    private async Task LockAsync(int kind, int key, CancellationToken ct)
    {
        RequireTransaction();
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({kind}, {key})", ct);
    }

    // Ngoài giao dịch, khóa tư vấn nhả ngay sau câu lệnh nên không có tác dụng: coi là lỗi lập trình.
    private void RequireTransaction()
    {
        if (db.Database.CurrentTransaction is null)
            throw new InvalidOperationException("Khóa đồng thời chỉ dùng được bên trong IConcurrencyGuard.RunAsync.");
    }

    // Tên ràng buộc do migration của ID 54 đặt. Ca làm (ex_shift_overlap) do WorkShiftRepository xử lý riêng.
    private static string? ToBusinessCode(Exception ex)
    {
        var pg = ex as PostgresException ?? ex.InnerException as PostgresException;
        if (pg is not { SqlState: PostgresErrorCodes.ExclusionViolation })
            return null;

        return pg.ConstraintName switch
        {
            "ex_staff_busy" => ErrorCodes.StaffConflict,
            "ex_cage_night" => ErrorCodes.CageConflict,
            _ => null,
        };
    }
}
