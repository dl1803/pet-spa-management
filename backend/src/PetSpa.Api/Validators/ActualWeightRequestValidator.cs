using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class ActualWeightRequestValidator : AbstractValidator<ActualWeightRequest>
{
    public ActualWeightRequestValidator()
    {
        RuleFor(x => x.ActualWeightKg)
            .NotNull().WithMessage("Cân nặng thực tế là bắt buộc.")
            .GreaterThan(0m).WithMessage("Cân nặng thực tế phải lớn hơn 0.")
            .LessThan(1000m).WithMessage("Cân nặng thực tế phải nhỏ hơn 1000 kg.")
            .PrecisionScale(5, 2, true).WithMessage("Cân nặng thực tế tối đa 3 chữ số nguyên và 2 chữ số thập phân.");
    }
}

