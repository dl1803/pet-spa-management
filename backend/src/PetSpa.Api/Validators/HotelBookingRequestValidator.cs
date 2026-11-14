using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class HotelBookingRequestValidator : AbstractValidator<HotelBookingRequest>
{
    public HotelBookingRequestValidator()
    {
        RuleFor(x => x.PetId)
            .NotNull().WithMessage("petId là bắt buộc.")
            .NotEqual(Guid.Empty).WithMessage("petId không hợp lệ.");

        RuleFor(x => x.PlannedCheckIn)
            .NotNull().WithMessage("plannedCheckIn là bắt buộc (ISO 8601, kèm múi giờ).");

        RuleFor(x => x.PlannedCheckOut)
            .NotNull().WithMessage("plannedCheckOut là bắt buộc (ISO 8601, kèm múi giờ).");
    }
}

