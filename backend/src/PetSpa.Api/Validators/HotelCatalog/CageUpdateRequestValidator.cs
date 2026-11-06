using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class CageUpdateRequestValidator : AbstractValidator<CageUpdateRequest>
{
    public CageUpdateRequestValidator()
    {
        When(x => x.Code is not null, () =>
        {
            RuleFor(x => x.Code)
                .NotEmpty().WithMessage("Mã chuồng không được để trống.")
                .MaximumLength(20).WithMessage("Mã chuồng tối đa 20 ký tự.");
        });

        RuleFor(x => x.Species)
            .IsInEnum().WithMessage("Cửa hàng chỉ phục vụ chó, mèo, thỏ, chuột lang.");

        RuleFor(x => x.SizeGroup)
            .IsInEnum().WithMessage("Nhóm kích cỡ không hợp lệ.");
    }
}

