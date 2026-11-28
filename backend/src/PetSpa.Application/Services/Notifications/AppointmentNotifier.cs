using System.Globalization;
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

    public async Task StatusChangedAsync(
        Guid appointmentId, AppointmentStatus status, CancellationToken ct = default)
    {
        var context = await reader.FindAsync(appointmentId, ct);
        if (context is null) return;

        var subject = Describe(context.Appointment);
        var message = status switch
        {
            AppointmentStatus.Received => $"{subject} đã được tiếp nhận.",
            AppointmentStatus.InProgress => $"{subject} đang được thực hiện.",
            AppointmentStatus.InStay => $"{subject}: thú cưng đã được tiếp nhận và đang lưu trú.",
            AppointmentStatus.Completed => $"{subject} đã hoàn tất.",
            _ => throw new InvalidOperationException($"Chưa hỗ trợ thông báo cho trạng thái {status}."),
        };

        await NotifyCustomerAsync(context, NotificationType.StatusChanged, message, ct);
    }

    public async Task PaymentRecordedAsync(
        Guid appointmentId, PaymentKind kind, decimal amount, CancellationToken ct = default)
    {
        var context = await reader.FindAsync(appointmentId, ct);
        if (context is null) return;

        var subject = Describe(context.Appointment);

        await NotifyCustomerAsync(
            context,
            NotificationType.PaymentRecorded,
            $"{subject}: đã ghi nhận thanh toán {PaymentKindText(kind)} {FormatMoney(amount)}.",
            ct);
    }

    public async Task CostConfirmationRequestedAsync(
        Guid appointmentId, decimal actualWeightKg, decimal newAmount, DateTimeOffset expiresAt,
        CancellationToken ct = default)
    {
        var context = await reader.FindAsync(appointmentId, ct);
        if (context is null) return;

        var subject = Describe(context.Appointment);
        var (date, time) = shopTimeZone.ToLocal(expiresAt);
        var deadline = FormattableString.Invariant($"{time:HH:mm} ngày {date:dd/MM/yyyy}");

        await NotifyCustomerAsync(
            context,
            NotificationType.CostConfirmation,
            $"{subject}: cân nặng thực tế của thú cưng là {FormatWeight(actualWeightKg)} kg nên chi phí mới là {FormatMoney(newAmount)}. Vui lòng xác nhận hoặc từ chối trước {deadline}.",
            ct);
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

    private static string PaymentKindText(PaymentKind kind) => kind switch
    {
        PaymentKind.Spa => "dịch vụ spa",
        PaymentKind.Stay => "tiền lưu trú",
        PaymentKind.LateFee => "phí trả muộn",
        _ => throw new InvalidOperationException($"Chưa hỗ trợ thông báo cho khoản thanh toán {kind}."),
    };

    private static string FormatMoney(decimal amount) =>
        amount.ToString("N0", CultureInfo.InvariantCulture).Replace(',', '.') + " đ";

    private static string FormatWeight(decimal actualWeightKg) =>
        actualWeightKg.ToString("0.##", CultureInfo.InvariantCulture).Replace('.', ',');

    private static string ReasonText(CancelReason reason) => reason switch
    {
        CancelReason.CustomerCancelled => "khách hàng chủ động hủy",
        CancelReason.StoreUnable => "cửa hàng không thể đáp ứng",
        CancelReason.CustomerBeyondDeadline => "theo yêu cầu của khách hàng ngoài thời hạn tự phục vụ",
        CancelReason.NoShow => "khách hàng vắng mặt",
        CancelReason.CostNotConfirmed => "chi phí mới không được khách hàng xác nhận",
        _ => throw new InvalidOperationException($"Chưa hỗ trợ thông báo cho lý do hủy {reason}."),
    };
}
