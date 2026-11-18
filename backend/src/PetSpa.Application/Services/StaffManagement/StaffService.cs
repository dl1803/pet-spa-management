using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Services.Notifications;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.StaffManagement;

public sealed class StaffService(
    IStaffRepository staffs,
    IAssignmentRepository assignments,
    IConcurrencyGuard concurrency,
    NotificationService notifications,
    ShopTimeZone shopTimeZone)
{
    private sealed record ReturnedAppointment(Guid AppointmentId, Guid? CustomerUserId, DateTimeOffset SlotStart);

    public Task<Guid> CreateAsync(
        string userName, string fullName, StaffRole staffRole, string password, CancellationToken ct = default) =>
        staffs.CreateAsync(PhoneNumber.Normalize(userName), fullName.Trim(), staffRole, password, ct);

    public Task<PagedResult<StaffSummary>> ListAsync(int page, int pageSize, CancellationToken ct = default) =>
        staffs.ListAsync(page, pageSize, ct);

    public Task UpdateAsync(Guid staffId, string fullName, StaffRole staffRole, CancellationToken ct = default) =>
        staffs.UpdateAsync(staffId, fullName.Trim(), staffRole, ct);

    public async Task<int> DeactivateAsync(Guid staffId, CancellationToken ct = default)
    {
        var returned = await concurrency.RunAsync(async () =>
        {
            await staffs.DeactivateAsync(staffId, ct);

            var result = new List<ReturnedAppointment>();
            foreach (var appointmentId in await staffs.ListConfirmedSpaAppointmentIdsAsync(staffId, ct))
            {
                await concurrency.LockAppointmentAsync(appointmentId, ct);

                var assignment = await staffs.FindConfirmedSpaAssignmentAsync(staffId, appointmentId, ct);
                if (assignment is null) continue;

                var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
                    ?? throw new BusinessException(ErrorCodes.NotFound);

                appointment.ReturnToPending();
                await assignments.SetStaffAssignmentsAsync(appointmentId, [], ct);
                await assignments.UpdateSpaAppointmentAsync(appointment, ct);

                result.Add(new ReturnedAppointment(appointmentId, assignment.CustomerUserId, appointment.SlotStart));
            }

            return result;
        }, ct);

        foreach (var item in returned.Where(x => x.CustomerUserId.HasValue))
        {
            await notifications.CreateAsync(
                item.CustomerUserId!.Value,
                NotificationType.StatusChanged,
                item.AppointmentId,
                BuildReturnedToPendingMessage(item.SlotStart),
                ct);
        }

        return returned.Count;
    }

    private string BuildReturnedToPendingMessage(DateTimeOffset slotStart)
    {
        var (date, time) = shopTimeZone.ToLocal(slotStart);
        return FormattableString.Invariant(
            $"Lịch spa lúc {time:HH:mm} ngày {date:dd/MM/yyyy} đã chuyển về trạng thái Chờ xác nhận vì nhân viên phụ trách ngừng làm việc. Cửa hàng sẽ phân công nhân viên khác và thông báo lại cho bạn.");
    }
}
