using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class SpaSlotsQueryValidator : AbstractValidator<SpaSlotsQuery>
{
    public SpaSlotsQueryValidator()
    {
        RuleFor(x => x.Date)
            .NotNull().WithMessage("date là bắt buộc (định dạng yyyy-MM-dd).");

        RuleFor(x => x.PetId)
            .NotNull().WithMessage("petId là bắt buộc.")
            .NotEqual(Guid.Empty).WithMessage("petId không hợp lệ.");

        RuleFor(x => x.ServiceIds)
            .Must(raw => SpaSlotsQuery.ParseServiceIds(raw) is not null)
            .WithMessage("serviceIds phải gồm ít nhất một mã dịch vụ hợp lệ, ngăn cách bằng dấu phẩy.");
    }
}

