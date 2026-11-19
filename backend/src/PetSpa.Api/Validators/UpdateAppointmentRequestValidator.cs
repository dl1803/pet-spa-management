using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class UpdateAppointmentRequestValidator : AbstractValidator<UpdateAppointmentRequest>
{
    public UpdateAppointmentRequestValidator()
    {
        RuleFor(x => x.PetId)
            .NotNull().WithMessage("petId là bắt buộc.")
            .NotEqual(Guid.Empty).WithMessage("petId không hợp lệ.");

        RuleFor(x => x.ServiceIds)
            .Must(ids => ids is null || ids.Count > 0)
            .WithMessage("serviceIds phải gồm ít nhất một mã dịch vụ.")
            .Must(ids => ids is null || ids.All(id => id != Guid.Empty))
            .WithMessage("serviceIds chứa mã dịch vụ không hợp lệ.");

        RuleFor(x => x.SlotStart)
            .Must(s => s is null || s.Value > DateTimeOffset.UtcNow)
            .WithMessage("Không thể đặt lịch ở thời điểm trong quá khứ.");

        RuleFor(x => x.PlannedCheckIn)
            .Must(d => d is null || d.Value > DateTimeOffset.UtcNow)
            .WithMessage("Không thể đặt lịch ở thời điểm trong quá khứ.");

        RuleFor(x => x.StaffIds)
            .Must(ids => ids is null || ids.Count is >= 1 and <= 2)
            .WithMessage("staffIds phải gồm từ 1 đến 2 mã nhân viên.")
            .Must(ids => ids is null || ids.All(id => id != Guid.Empty))
            .WithMessage("staffIds chứa mã nhân viên không hợp lệ.");

        RuleFor(x => x.CageId)
            .NotEqual(Guid.Empty)
            .When(x => x.CageId.HasValue)
            .WithMessage("cageId không hợp lệ.");
    }
}
