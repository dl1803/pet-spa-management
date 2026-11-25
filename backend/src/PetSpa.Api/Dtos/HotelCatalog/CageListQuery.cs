namespace PetSpa.Api.Dtos;

public sealed class CageListQuery
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
