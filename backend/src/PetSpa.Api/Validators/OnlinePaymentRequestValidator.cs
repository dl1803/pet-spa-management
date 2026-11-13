using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class OnlinePaymentRequestValidator : AbstractValidator<OnlinePaymentRequest>
{
    public OnlinePaymentRequestValidator()
    {
        RuleFor(x => x.Gateway)
            .NotNull().WithMessage("gateway là bắt buộc.")
            .IsInEnum().WithMessage("gateway chỉ gồm VNPAY, MoMo.");
    }
}
