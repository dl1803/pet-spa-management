using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Domain.Entities;

public class Payment
{
    public Guid PaymentId { get; set; }
    public Guid AppointmentId { get; set; }
    public PaymentKind Kind { get; set; }
    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Unpaid;
    public PaymentMethod? Method { get; set; }
    public decimal? ReceivedAmount { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public Guid? ConfirmedByUserId { get; set; }

    public void MarkPaid(
        AppointmentStatus appointmentStatus,
        decimal receivedAmount,
        PaymentMethod method,
        Guid? confirmedByUserId = null)
    {
        if (method == PaymentMethod.Online)
        {
            if (confirmedByUserId is not null)
            {
                throw new ArgumentException("Thanh toán trực tuyến không có người xác nhận.", nameof(confirmedByUserId));
            }
        }
        else if (confirmedByUserId is null)
        {
            throw new ArgumentException("Thanh toán tại quầy phải có người xác nhận.", nameof(confirmedByUserId));
        }

        if (Status != PaymentStatus.Unpaid || !IsDueFor(appointmentStatus, method))
        {
            throw new BusinessException(ErrorCodes.PaymentNotDue);
        }

        var enough = method == PaymentMethod.Online
            ? receivedAmount == Amount
            : receivedAmount >= Amount;
        if (!enough)
        {
            throw new BusinessException(ErrorCodes.AmountMismatch);
        }

        Status = PaymentStatus.Paid;
        Method = method;
        ReceivedAmount = receivedAmount;
        PaidAt = DateTimeOffset.UtcNow;
        ConfirmedByUserId = confirmedByUserId;
    }

    private bool IsDueFor(AppointmentStatus appointmentStatus, PaymentMethod method) => Kind switch
    {
        PaymentKind.Spa => appointmentStatus == AppointmentStatus.Completed,
        PaymentKind.Stay => appointmentStatus == AppointmentStatus.Confirmed && method != PaymentMethod.Online,
        PaymentKind.LateFee => appointmentStatus == AppointmentStatus.InStay && method != PaymentMethod.Online,
        _ => false,
    };
}
