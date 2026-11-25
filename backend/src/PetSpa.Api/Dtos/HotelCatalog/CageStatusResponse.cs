using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record CageOccupantResponse(
    Guid PetId, string PetName, Guid CustomerId, string CustomerName, DateTimeOffset PlannedCheckOut);

public sealed record CageStatusResponse(
    Guid CageId,
    string Code,
    Species Species,
    SizeGroup SizeGroup,
    bool IsActive,
    CageOccupantResponse? Occupant)
{
    public static CageStatusResponse From(CageStatus status) => new(
        status.Cage.CageId,
        status.Cage.Code,
        status.Cage.Species,
        status.Cage.SizeGroup,
        status.Cage.IsActive,
        status.Occupant is null
            ? null
            : new CageOccupantResponse(
                status.Occupant.PetId,
                status.Occupant.PetName,
                status.Occupant.CustomerId,
                status.Occupant.CustomerName,
                status.Occupant.PlannedCheckOut));
}
