using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class CostConfirmationRespondRequestValidator : AbstractValidator<CostConfirmationRespondRequest>
{
    public CostConfirmationRespondRequestValidator()
    {
        RuleFor(x => x.Accept)
            .NotNull().WithMessage("Trường accept là bắt buộc.");
    }
}

