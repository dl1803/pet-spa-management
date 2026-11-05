using FluentValidation;
using PetSpa.Api.Dtos;
using PetSpa.Application.Common;

namespace PetSpa.Api.Validators;

public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.UserName)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng nhập số điện thoại.")
            .Must(PhoneNumber.IsValid).WithMessage("Số điện thoại không đúng định dạng.");

        RuleFor(x => x.FullName)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng nhập họ tên.")
            .MaximumLength(150).WithMessage("Họ tên tối đa 150 ký tự.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Vui lòng nhập mật khẩu.");

        RuleFor(x => x.Email)
            .MaximumLength(150).WithMessage("Email tối đa 150 ký tự.")
            .EmailAddress().WithMessage("Email không đúng định dạng.")
            .When(x => !string.IsNullOrWhiteSpace(x.Email));
    }
}

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        // Chỉ kiểm tra có nhập; không kiểm tra định dạng để không lộ quy tắc và vẫn đăng nhập được mọi vai trò.
        RuleFor(x => x.UserName).NotEmpty().WithMessage("Vui lòng nhập số điện thoại.");
        RuleFor(x => x.Password).NotEmpty().WithMessage("Vui lòng nhập mật khẩu.");
    }
}

public sealed class RefreshRequestValidator : AbstractValidator<RefreshRequest>
{
    public RefreshRequestValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty().WithMessage("Vui lòng cung cấp refresh token.");
    }
}
