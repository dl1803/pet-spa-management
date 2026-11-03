using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class ActiveToggleRequestValidator : AbstractValidator<ActiveToggleRequest>
{
    public ActiveToggleRequestValidator()
    {
        RuleFor(x => x.IsActive)
            .NotNull().WithMessage("Trạng thái cung cấp là bắt buộc.");
    }
}
