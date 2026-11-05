using FluentValidation;
using PetSpa.Api.Dtos;
using PetSpa.Application.Common;

namespace PetSpa.Api.Validators;

public sealed class UpdateMeRequestValidator : AbstractValidator<UpdateMeRequest>
{
    public UpdateMeRequestValidator()
    {
        // fullName bắt buộc với khách hàng/nhân viên: AccountService kiểm tra theo vai trò (quản lý bỏ qua).
        RuleFor(x => x.FullName)
            .MaximumLength(150).WithMessage("Họ tên tối đa 150 ký tự.");

        RuleFor(x => x.Phone)
            .Must(PhoneNumber.IsValid).WithMessage("Số điện thoại không đúng định dạng.")
            .When(x => x.Phone is not null);

        RuleFor(x => x.Email)
            .MaximumLength(150).WithMessage("Email tối đa 150 ký tự.")
            .EmailAddress().WithMessage("Email không đúng định dạng.")
            .When(x => !string.IsNullOrWhiteSpace(x.Email));
    }
}

public sealed class WalkInRequestValidator : AbstractValidator<WalkInRequest>
{
    public WalkInRequestValidator()
    {
        RuleFor(x => x.FullName)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng nhập họ tên.")
            .MaximumLength(150).WithMessage("Họ tên tối đa 150 ký tự.");

        RuleFor(x => x.Phone)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng nhập số điện thoại.")
            .Must(PhoneNumber.IsValid).WithMessage("Số điện thoại không đúng định dạng.");
    }
}

public sealed class ListCustomersQueryValidator : AbstractValidator<ListCustomersQuery>
{
    public ListCustomersQueryValidator()
    {
        // Giống PetListQueryValidator đã merge.
        RuleFor(x => x.Page)
            .InclusiveBetween(1, 1_000_000).WithMessage("page phải từ 1 đến 1.000.000.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100).WithMessage("pageSize phải từ 1 đến 100.");
    }
}
