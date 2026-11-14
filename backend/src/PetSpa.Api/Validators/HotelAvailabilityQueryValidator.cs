using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class HotelAvailabilityQueryValidator : AbstractValidator<HotelAvailabilityQuery>
{
    public HotelAvailabilityQueryValidator()
    {
        RuleFor(x => x.From)
            .NotNull().WithMessage("from là bắt buộc (ISO 8601, kèm múi giờ).");

        RuleFor(x => x.To)
            .NotNull().WithMessage("to là bắt buộc (ISO 8601, kèm múi giờ).");

        RuleFor(x => x.PetId)
            .NotNull().WithMessage("petId là bắt buộc.")
            .NotEqual(Guid.Empty).WithMessage("petId không hợp lệ.");
    }
}

