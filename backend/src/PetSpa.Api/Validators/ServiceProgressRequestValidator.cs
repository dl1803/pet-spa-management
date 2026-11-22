using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class ServiceProgressRequestValidator : AbstractValidator<ServiceProgressRequest>
{
    public const int NoteMaxLength = 1000;

    public ServiceProgressRequestValidator()
    {
        RuleFor(x => x.IsDone)
            .NotNull().WithMessage("isDone là bắt buộc.");

        RuleFor(x => x.Note)
            .MaximumLength(NoteMaxLength).WithMessage("Ghi chú tối đa 1000 ký tự.");
    }
}
