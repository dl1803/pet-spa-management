using System.Globalization;
using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class ServiceRequestValidator : AbstractValidator<ServiceRequest>
{
    public ServiceRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Tên dịch vụ là bắt buộc.")
            .MaximumLength(150).WithMessage("Tên dịch vụ tối đa 150 ký tự.");

        RuleFor(x => x.LatestStartTime)
            .Must(v => TimeOnly.TryParseExact(v, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            .WithMessage("Mốc giờ bắt đầu muộn nhất là bắt buộc và có dạng HH:mm.");

        RuleFor(x => x.Pricing)
            .NotEmpty().WithMessage("Dịch vụ phải có ít nhất một dòng giá và thời lượng.");

        RuleForEach(x => x.Pricing)
            .NotNull().WithMessage("Dòng giá không được để trống.")
            .SetValidator(new PricingRowRequestValidator());
    }
}
