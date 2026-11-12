using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class PaymentTests
{
    private static readonly Guid Receptionist = Guid.NewGuid();

    private static Payment Unpaid(PaymentKind kind = PaymentKind.Spa, decimal amount = 200_000m) =>
        new() { PaymentId = Guid.NewGuid(), AppointmentId = Guid.NewGuid(), Kind = kind, Amount = amount };

    private static AppointmentStatus DueStatus(PaymentKind kind) => kind switch
    {
        PaymentKind.Spa => AppointmentStatus.Completed,
        PaymentKind.Stay => AppointmentStatus.Confirmed,
        _ => AppointmentStatus.InStay,
    };

    private static void AssertStillUnpaid(Payment payment)
    {
        Assert.Equal(PaymentStatus.Unpaid, payment.Status);
        Assert.Null(payment.Method);
        Assert.Null(payment.ReceivedAmount);
        Assert.Null(payment.PaidAt);
        Assert.Null(payment.ConfirmedByUserId);
    }

    private static void AssertCode(string code, Action action)
    {
        var ex = Assert.Throws<BusinessException>(action);
        Assert.Equal(code, ex.Code);
    }

    public static IEnumerable<object[]> NotDueCombinations()
    {
        foreach (var kind in Enum.GetValues<PaymentKind>())
        {
            foreach (var status in Enum.GetValues<AppointmentStatus>())
            {
                if (status != DueStatus(kind))
                {
                    yield return new object[] { kind, status };
                }
            }
        }
    }

    [Theory]
    [InlineData(PaymentKind.Spa, AppointmentStatus.Completed, PaymentMethod.Cash)]
    [InlineData(PaymentKind.Spa, AppointmentStatus.Completed, PaymentMethod.BankQR)]
    [InlineData(PaymentKind.Stay, AppointmentStatus.Confirmed, PaymentMethod.Cash)]
    [InlineData(PaymentKind.LateFee, AppointmentStatus.InStay, PaymentMethod.BankQR)]
    public void MarkPaid_AtCounter_AtDueTimeWithExactAmount_MarksPaid(
        PaymentKind kind, AppointmentStatus status, PaymentMethod method)
    {
        var payment = Unpaid(kind);
        var before = DateTimeOffset.UtcNow;

        payment.MarkPaid(status, 200_000m, method, Receptionist);

        Assert.Equal(PaymentStatus.Paid, payment.Status);
        Assert.Equal(method, payment.Method);
        Assert.Equal(200_000m, payment.ReceivedAmount);
        Assert.Equal(Receptionist, payment.ConfirmedByUserId);
        Assert.NotNull(payment.PaidAt);
        Assert.InRange(payment.PaidAt!.Value, before, DateTimeOffset.UtcNow);
    }

    [Fact]
    public void MarkPaid_AtCounter_ReceivedGreaterThanAmount_MarksPaidAndKeepsReceivedAmount()
    {
        var payment = Unpaid();

        payment.MarkPaid(AppointmentStatus.Completed, 250_000m, PaymentMethod.Cash, Receptionist);

        Assert.Equal(PaymentStatus.Paid, payment.Status);
        Assert.Equal(250_000m, payment.ReceivedAmount);
    }

    [Fact]
    public void MarkPaid_AtCounter_ReceivedLessThanAmount_ThrowsAmountMismatchAndKeepsUnpaid()
    {
        var payment = Unpaid();

        AssertCode(ErrorCodes.AmountMismatch,
            () => payment.MarkPaid(AppointmentStatus.Completed, 199_999m, PaymentMethod.BankQR, Receptionist));

        AssertStillUnpaid(payment);
    }

    [Fact]
    public void MarkPaid_Online_ExactAmount_MarksPaidWithoutConfirmer()
    {
        var payment = Unpaid();

        payment.MarkPaid(AppointmentStatus.Completed, 200_000m, PaymentMethod.Online);

        Assert.Equal(PaymentStatus.Paid, payment.Status);
        Assert.Equal(PaymentMethod.Online, payment.Method);
        Assert.Equal(200_000m, payment.ReceivedAmount);
        Assert.Null(payment.ConfirmedByUserId);
        Assert.NotNull(payment.PaidAt);
    }

    [Theory]
    [InlineData(199_999)]
    [InlineData(200_001)]
    public void MarkPaid_Online_AmountDiffers_ThrowsAmountMismatchAndKeepsUnpaid(int received)
    {
        var payment = Unpaid();

        AssertCode(ErrorCodes.AmountMismatch,
            () => payment.MarkPaid(AppointmentStatus.Completed, received, PaymentMethod.Online));

        AssertStillUnpaid(payment);
    }

    [Theory]
    [MemberData(nameof(NotDueCombinations))]
    public void MarkPaid_AtWrongAppointmentStatus_ThrowsPaymentNotDueAndKeepsUnpaid(
        PaymentKind kind, AppointmentStatus status)
    {
        var payment = Unpaid(kind);

        AssertCode(ErrorCodes.PaymentNotDue,
            () => payment.MarkPaid(status, 200_000m, PaymentMethod.Cash, Receptionist));

        AssertStillUnpaid(payment);
    }

    [Theory]
    [InlineData(PaymentKind.Stay, AppointmentStatus.Confirmed)]
    [InlineData(PaymentKind.LateFee, AppointmentStatus.InStay)]
    public void MarkPaid_OnlineForStayOrLateFee_ThrowsPaymentNotDueAndKeepsUnpaid(
        PaymentKind kind, AppointmentStatus status)
    {
        var payment = Unpaid(kind);

        AssertCode(ErrorCodes.PaymentNotDue,
            () => payment.MarkPaid(status, 200_000m, PaymentMethod.Online));

        AssertStillUnpaid(payment);
    }

    [Fact]
    public void MarkPaid_WhenAlreadyPaid_ThrowsPaymentNotDueAndKeepsFirstRecord()
    {
        var payment = Unpaid();
        payment.MarkPaid(AppointmentStatus.Completed, 200_000m, PaymentMethod.Cash, Receptionist);
        var paidAt = payment.PaidAt;

        AssertCode(ErrorCodes.PaymentNotDue,
            () => payment.MarkPaid(AppointmentStatus.Completed, 200_000m, PaymentMethod.Online));

        Assert.Equal(PaymentStatus.Paid, payment.Status);
        Assert.Equal(PaymentMethod.Cash, payment.Method);
        Assert.Equal(Receptionist, payment.ConfirmedByUserId);
        Assert.Equal(paidAt, payment.PaidAt);
    }

    [Fact]
    public void MarkPaid_WrongTimingAndShortAmount_ReportsPaymentNotDueFirst()
    {
        var payment = Unpaid();

        AssertCode(ErrorCodes.PaymentNotDue,
            () => payment.MarkPaid(AppointmentStatus.InProgress, 1m, PaymentMethod.Cash, Receptionist));

        AssertStillUnpaid(payment);
    }

    [Fact]
    public void MarkPaid_AtCounterWithoutConfirmer_ThrowsArgumentExceptionAndKeepsUnpaid()
    {
        var payment = Unpaid();

        Assert.Throws<ArgumentException>(
            () => payment.MarkPaid(AppointmentStatus.Completed, 200_000m, PaymentMethod.Cash));

        AssertStillUnpaid(payment);
    }

    [Fact]
    public void MarkPaid_OnlineWithConfirmer_ThrowsArgumentExceptionAndKeepsUnpaid()
    {
        var payment = Unpaid();

        Assert.Throws<ArgumentException>(
            () => payment.MarkPaid(AppointmentStatus.Completed, 200_000m, PaymentMethod.Online, Receptionist));

        AssertStillUnpaid(payment);
    }
}
