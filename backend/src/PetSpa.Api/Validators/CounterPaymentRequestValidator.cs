using FluentValidation;
using PetSpa.Api.Dtos;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Validators;

public sealed class CounterPaymentRequestValidator : AbstractValidator<CounterPaymentRequest>
{
    private const long MaxAmount = 999_999_999_999;

    public CounterPaymentRequestValidator()
    {
        RuleFor(x => x.Method)
            .NotNull().WithMessage("method là bắt buộc.")
            .Must(m => m is null or PaymentMethod.Cash or PaymentMethod.BankQR)
            .WithMessage("method chỉ gồm Cash hoặc BankQR.");

        RuleFor(x => x.ReceivedAmount)
            .NotNull().WithMessage("receivedAmount là bắt buộc.")
            .Must(v => v is null || (v >= 0 && v <= MaxAmount))
            .WithMessage("receivedAmount phải từ 0 đến 999.999.999.999 VND.");
    }
}

