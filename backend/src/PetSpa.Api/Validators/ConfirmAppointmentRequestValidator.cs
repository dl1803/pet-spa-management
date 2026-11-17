using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class ConfirmAppointmentRequestValidator : AbstractValidator<ConfirmAppointmentRequest>
{
    public ConfirmAppointmentRequestValidator()
    {
        RuleFor(x => x.StaffIds)
            .NotEmpty().WithMessage("staffIds phải gồm ít nhất một mã nhân viên.")
            .Must(ids => ids is null || ids.Count <= 2).WithMessage("staffIds tối đa 2 mã nhân viên.")
            .Must(ids => ids is null || ids.All(id => id != Guid.Empty))
            .WithMessage("staffIds chứa mã nhân viên không hợp lệ.");
    }
}

