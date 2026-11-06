using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services;

public sealed class HotelCatalogService(IHotelCatalogRepository repository)
{
    public async Task<Guid> CreateCageAsync(CageInput input, CancellationToken ct = default)
    {
        var cage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = input.Code.Trim(),
            Species = input.Species,
            SizeGroup = input.SizeGroup,
        };

        await repository.AddCageAsync(cage, ct);
        return cage.CageId;
    }

    public async Task UpdateCageAsync(Guid cageId, CageUpdateInput input, CancellationToken ct = default)
    {
        var updated = await repository.UpdateCageAsync(cageId, input.Code?.Trim(), input.Species, input.SizeGroup, ct);
        if (!updated) throw new BusinessException(ErrorCodes.NotFound);
    }

    public async Task SetCageActiveAsync(Guid cageId, bool isActive, CancellationToken ct = default)
    {
        if (!await repository.SetCageActiveAsync(cageId, isActive, ct))
            throw new BusinessException(ErrorCodes.NotFound);
    }
}

