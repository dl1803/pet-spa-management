using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class HotelPricingRequestValidator : AbstractValidator<HotelPricingRequest>
{
    public HotelPricingRequestValidator()
    {
        RuleFor(x => x.Pricing)
            .NotNull().WithMessage("Danh sách giá lưu trú là bắt buộc.");

        RuleForEach(x => x.Pricing)
            .NotNull().WithMessage("Dòng giá không được để trống.")
            .SetValidator(new HotelPricingRowRequestValidator());

        RuleFor(x => x.LateFeePerBlock)
            .NotNull().WithMessage("Phí phạt trả muộn mỗi lần là bắt buộc.")
            .Must(v => v is null || (v >= 0 && v <= HotelPricingRowRequestValidator.MaxAmount))
            .WithMessage("Phí phạt trả muộn mỗi lần phải từ 0 đến 999.999.999.999 VND.");
    }
}

