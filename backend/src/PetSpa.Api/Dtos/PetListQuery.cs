namespace PetSpa.Api.Dtos;

public sealed class PetListQuery
{
    public Guid? CustomerId { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
