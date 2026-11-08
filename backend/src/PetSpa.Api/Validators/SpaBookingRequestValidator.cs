using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class SpaBookingRequestValidator : AbstractValidator<SpaBookingRequest>
{
    public SpaBookingRequestValidator()
    {
        RuleFor(x => x.PetId)
            .NotNull().WithMessage("petId là bắt buộc.")
            .NotEqual(Guid.Empty).WithMessage("petId không hợp lệ.");

        RuleFor(x => x.ServiceIds)
            .NotEmpty().WithMessage("serviceIds phải gồm ít nhất một mã dịch vụ.")
            .Must(ids => ids is null || ids.All(id => id != Guid.Empty))
            .WithMessage("serviceIds chứa mã dịch vụ không hợp lệ.");

        RuleFor(x => x.SlotStart)
            .NotNull().WithMessage("slotStart là bắt buộc (ISO 8601, kèm múi giờ).");
    }
}

