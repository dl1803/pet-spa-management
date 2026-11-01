using FluentValidation;
using PetSpa.Api.Dtos;
using PetSpa.Application.Common;

namespace PetSpa.Api.Validators;

public sealed class CreateStaffRequestValidator : AbstractValidator<CreateStaffRequest>
{
    public CreateStaffRequestValidator()
    {
        RuleFor(x => x.UserName)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng nhập số điện thoại.")
            .Must(PhoneNumber.IsValid).WithMessage("Số điện thoại không đúng định dạng.");

        RuleFor(x => x.FullName)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng nhập họ tên.")
            .MaximumLength(150).WithMessage("Họ tên tối đa 150 ký tự.");

        RuleFor(x => x.StaffRole)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("Vui lòng chọn vai trò nhân viên (lễ tân hoặc nhân viên spa).")
            .IsInEnum().WithMessage("Vai trò nhân viên không hợp lệ.");

        // Độ mạnh mật khẩu do ASP.NET Core Identity kiểm tra khi tạo tài khoản.
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Vui lòng nhập mật khẩu.");
    }
}

public sealed class UpdateStaffRequestValidator : AbstractValidator<UpdateStaffRequest>
{
    public UpdateStaffRequestValidator()
    {
        RuleFor(x => x.FullName)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng nhập họ tên.")
            .MaximumLength(150).WithMessage("Họ tên tối đa 150 ký tự.");

        RuleFor(x => x.StaffRole)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("Vui lòng chọn vai trò nhân viên (lễ tân hoặc nhân viên spa).")
            .IsInEnum().WithMessage("Vai trò nhân viên không hợp lệ.");
    }
}

public sealed class ListStaffQueryValidator : AbstractValidator<ListStaffQuery>
{
    public ListStaffQueryValidator()
    {
        // Giống ListCustomersQueryValidator và PetListQueryValidator đã merge.
        RuleFor(x => x.Page)
            .InclusiveBetween(1, 1_000_000).WithMessage("page phải từ 1 đến 1.000.000.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100).WithMessage("pageSize phải từ 1 đến 100.");
    }
}
