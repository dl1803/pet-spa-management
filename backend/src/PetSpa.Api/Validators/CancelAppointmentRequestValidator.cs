using FluentValidation;
using PetSpa.Api.Dtos;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Validators;

public sealed class CancelAppointmentRequestValidator : AbstractValidator<CancelAppointmentRequest>
{
    public CancelAppointmentRequestValidator()
    {
        RuleFor(x => x.Reason)
            .Must(r => r is null or CancelReason.StoreUnable or CancelReason.CustomerBeyondDeadline)
            .WithMessage("reason chỉ được là StoreUnable hoặc CustomerBeyondDeadline.");
    }
}
