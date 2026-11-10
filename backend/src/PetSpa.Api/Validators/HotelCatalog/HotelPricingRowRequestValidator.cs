using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class HotelPricingRowRequestValidator : AbstractValidator<HotelPricingRowRequest>
{
    public const long MaxAmount = 999_999_999_999;

    public HotelPricingRowRequestValidator()
    {
        RuleFor(x => x.Species)
            .NotNull().WithMessage("Loài là bắt buộc.")
            .IsInEnum().WithMessage("Cửa hàng chỉ phục vụ chó, mèo, thỏ, chuột lang.");

        RuleFor(x => x.SizeGroup)
            .NotNull().WithMessage("Nhóm kích cỡ là bắt buộc.")
            .IsInEnum().WithMessage("Nhóm kích cỡ không hợp lệ.");

        RuleFor(x => x.PricePerNight)
            .NotNull().WithMessage("Giá lưu trú mỗi đêm là bắt buộc.")
            .Must(v => v is null || (v >= 0 && v <= MaxAmount))
            .WithMessage("Giá lưu trú mỗi đêm phải từ 0 đến 999.999.999.999 VND.");

        RuleFor(x => x.FoodPerNight)
            .NotNull().WithMessage("Giá thức ăn mỗi đêm là bắt buộc.")
            .Must(v => v is null || (v >= 0 && v <= MaxAmount))
            .WithMessage("Giá thức ăn mỗi đêm phải từ 0 đến 999.999.999.999 VND.");
    }
}

