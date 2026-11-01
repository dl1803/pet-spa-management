using FluentValidation;
using PetSpa.Api.Dtos;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Validators;

public sealed class PetRequestValidator : AbstractValidator<PetRequest>
{
    public PetRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Tên thú cưng là bắt buộc.")
            .MaximumLength(100).WithMessage("Tên thú cưng tối đa 100 ký tự.");

        RuleFor(x => x.Species)
            .NotNull().WithMessage("Loài là bắt buộc.")
            .IsInEnum().WithMessage("Cửa hàng chỉ phục vụ chó, mèo, thỏ, chuột lang.");

        RuleFor(x => x.Breed)
            .NotEmpty().WithMessage("Giống là bắt buộc.")
            .MaximumLength(100).WithMessage("Giống tối đa 100 ký tự.");

        RuleFor(x => x.Temperament)
            .IsInEnum().WithMessage("Tính cách chỉ gồm Calm, Normal, Difficult.");

        RuleFor(x => x.WeightKg)
            .NotNull().WithMessage("Cân nặng là bắt buộc.")
            .GreaterThan(0m).WithMessage("Cân nặng phải lớn hơn 0.")
            .PrecisionScale(5, 2, true).WithMessage("Cân nặng tối đa 3 chữ số nguyên và 2 chữ số thập phân.");

        RuleFor(x => x.HeightCm)
            .NotNull().When(x => x.Species == Species.Dog)
            .WithMessage("Chiều cao là bắt buộc đối với chó.");

        When(x => x.HeightCm.HasValue, () =>
        {
            RuleFor(x => x.HeightCm)
                .GreaterThan(0m).WithMessage("Chiều cao phải lớn hơn 0.")
                .PrecisionScale(5, 1, true).WithMessage("Chiều cao tối đa 4 chữ số nguyên và 1 chữ số thập phân.");
        });

        RuleFor(x => x.CoatNote)
            .MaximumLength(255).WithMessage("Đặc điểm lông tối đa 255 ký tự.");
    }
}

