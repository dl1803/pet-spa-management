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
