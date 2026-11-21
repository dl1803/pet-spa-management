using FluentValidation;
using PetSpa.Api.Dtos;
using PetSpa.Application.Common;

namespace PetSpa.Api.Validators;

public sealed class UploadPhotoRequestValidator : AbstractValidator<UploadPhotoRequest>
{
    public UploadPhotoRequestValidator()
    {
        RuleFor(x => x.Kind)
            .NotNull().WithMessage("kind là bắt buộc (Before hoặc After).")
            .IsInEnum().WithMessage("kind chỉ nhận Before hoặc After.");

        RuleFor(x => x.File)
            .NotNull().WithMessage("file là bắt buộc.");

        When(x => x.File is not null, () =>
        {
            RuleFor(x => x.File!.Length)
                .GreaterThan(0).WithMessage("Tệp ảnh không được rỗng.")
                .LessThanOrEqualTo(PhotoRules.MaxFileBytes).WithMessage("Tệp ảnh tối đa 50 MB.");
        });
    }
}
