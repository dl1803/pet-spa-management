using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services.Notifications;

public sealed class AppointmentNotifier(
    IAppointmentNotificationReader reader,
    NotificationService notifications,
    ShopTimeZone shopTimeZone)
{
    public async Task BookingReceivedAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var context = await reader.FindAsync(appointmentId, ct);
        if (context is null) return;

        var subject = Describe(context.Appointment);

        await NotifyCustomerAsync(
            context,
            NotificationType.BookingReceived,
            $"{subject} đã được ghi nhận và đang chờ cửa hàng xác nhận.",
            ct);
    }

    public async Task ConfirmedAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var context = await reader.FindAsync(appointmentId, ct);
        if (context is null) return;

        var subject = Describe(context.Appointment);

        await NotifyCustomerAsync(
            context,
            NotificationType.ConfirmedAssigned,
            $"{subject} đã được cửa hàng xác nhận.",
            ct);

        foreach (var staffUserId in context.StaffUserIds)
        {
            await notifications.CreateAsync(
                staffUserId,
                NotificationType.ConfirmedAssigned,
                appointmentId,
                $"{subject} đã được phân công cho bạn.",
                ct);
        }
    }

    public async Task CancelledAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var context = await reader.FindAsync(appointmentId, ct);
        if (context is null) return;

        var reason = context.Appointment.CancelReason
            ?? throw new InvalidOperationException("Lịch hẹn chưa có lý do hủy.");
        var subject = Describe(context.Appointment);
        var reasonText = ReasonText(reason);

        await NotifyCustomerAsync(
            context,
            NotificationType.Cancelled,
            $"{subject} đã bị hủy. Lý do: {reasonText}.",
            ct);

        foreach (var staffUserId in context.StaffUserIds)
        {
            await notifications.CreateAsync(
                staffUserId,
                NotificationType.Cancelled,
                appointmentId,
                $"{subject} do bạn phụ trách đã bị hủy. Lý do: {reasonText}.",
                ct);
        }
    }

    private async Task NotifyCustomerAsync(
        AppointmentNotificationContext context, NotificationType type, string message, CancellationToken ct)
    {
        if (context.CustomerUserId is not { } customerUserId) return;

        await notifications.CreateAsync(customerUserId, type, context.Appointment.AppointmentId, message, ct);
    }

    private string Describe(Appointment appointment)
    {
        if (appointment is SpaAppointment spa)
        {
            var (date, time) = shopTimeZone.ToLocal(spa.SlotStart);
            return FormattableString.Invariant($"Lịch spa lúc {time:HH:mm} ngày {date:dd/MM/yyyy}");
        }

        if (appointment is HotelAppointment hotel)
        {
            var checkIn = shopTimeZone.ToLocal(hotel.PlannedCheckIn).Date;
            var checkOut = shopTimeZone.ToLocal(hotel.PlannedCheckOut).Date;
            return FormattableString.Invariant($"Lịch lưu trú từ ngày {checkIn:dd/MM/yyyy} đến ngày {checkOut:dd/MM/yyyy}");
        }

        throw new InvalidOperationException("Loại lịch hẹn không được hỗ trợ.");
    }

    private static string ReasonText(CancelReason reason) => reason switch
    {
        CancelReason.CustomerCancelled => "khách hàng chủ động hủy",
        CancelReason.StoreUnable => "cửa hàng không thể đáp ứng",
        CancelReason.CustomerBeyondDeadline => "theo yêu cầu của khách hàng ngoài thời hạn tự phục vụ",
        _ => throw new InvalidOperationException($"Chưa hỗ trợ thông báo cho lý do hủy {reason}."),
    };
}
