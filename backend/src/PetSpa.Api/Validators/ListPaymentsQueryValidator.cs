using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class ListPaymentsQueryValidator : AbstractValidator<ListPaymentsQuery>
{
    public ListPaymentsQueryValidator()
    {
        RuleFor(x => x.Status)
            .IsInEnum().WithMessage("status phải là Unpaid hoặc Paid.");

        RuleFor(x => x.Page)
            .InclusiveBetween(1, 1_000_000).WithMessage("page phải từ 1 đến 1.000.000.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100).WithMessage("pageSize phải từ 1 đến 100.");
    }
}

