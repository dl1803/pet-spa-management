using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class ListAppointmentsQueryValidator : AbstractValidator<ListAppointmentsQuery>
{
    private static readonly DateOnly EarliestDate = new(2000, 1, 1);
    private static readonly DateOnly LatestDate = new(2100, 12, 31);

    public ListAppointmentsQueryValidator()
    {
        RuleFor(x => x.Page)
            .InclusiveBetween(1, 1_000_000).WithMessage("page phải từ 1 đến 1.000.000.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100).WithMessage("pageSize phải từ 1 đến 100.");

        RuleFor(x => x.Date)
            .Must(date => date is null || (date.Value >= EarliestDate && date.Value <= LatestDate))
            .WithMessage("date phải từ 2000-01-01 đến 2100-12-31 (định dạng yyyy-MM-dd).");
    }
}

