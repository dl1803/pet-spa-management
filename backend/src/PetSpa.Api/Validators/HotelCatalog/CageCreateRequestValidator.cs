using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class CageCreateRequestValidator : AbstractValidator<CageCreateRequest>
{
    public CageCreateRequestValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Mã chuồng là bắt buộc.")
            .MaximumLength(20).WithMessage("Mã chuồng tối đa 20 ký tự.");

        RuleFor(x => x.Species)
            .NotNull().WithMessage("Loài phù hợp là bắt buộc.")
            .IsInEnum().WithMessage("Cửa hàng chỉ phục vụ chó, mèo, thỏ, chuột lang.");

        RuleFor(x => x.SizeGroup)
            .NotNull().WithMessage("Nhóm kích cỡ phù hợp là bắt buộc.")
            .IsInEnum().WithMessage("Nhóm kích cỡ không hợp lệ.");
    }
}

