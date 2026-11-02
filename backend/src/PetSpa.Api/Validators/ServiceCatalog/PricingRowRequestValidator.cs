using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class PricingRowRequestValidator : AbstractValidator<PricingRowRequest>
{
    private const long MaxPrice = 999_999_999_999;

    public PricingRowRequestValidator()
    {
        RuleFor(x => x.Species)
            .NotNull().WithMessage("Loài áp dụng là bắt buộc.")
            .IsInEnum().WithMessage("Loài áp dụng không hợp lệ.");

        RuleFor(x => x.SizeGroup)
            .NotNull().WithMessage("Nhóm kích cỡ là bắt buộc.")
            .IsInEnum().WithMessage("Nhóm kích cỡ không hợp lệ.");

        RuleFor(x => x.Price)
            .NotNull().WithMessage("Giá dịch vụ là bắt buộc.")
            .Must(v => v is null || (v >= 0 && v <= MaxPrice))
            .WithMessage("Giá dịch vụ phải từ 0 đến 999.999.999.999 VND.");

        RuleFor(x => x.DurationMinutes)
            .NotNull().WithMessage("Thời lượng dự kiến là bắt buộc.")
            .Must(v => v is null || v > 0)
            .WithMessage("Thời lượng dự kiến phải lớn hơn 0 phút.");

        RuleFor(x => x.StaffRequired)
            .NotNull().WithMessage("Số nhân viên cần là bắt buộc.")
            .Must(v => v is null || v == 1 || v == 2)
            .WithMessage("Số nhân viên cần phải là 1 hoặc 2.");
    }
}
