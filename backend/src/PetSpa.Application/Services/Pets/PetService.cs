using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Pets;

public sealed class PetService(IPetRepository pets, IStaffRoleReader staffRoles)
{
    private enum PetActor
    {
        Customer,
        Receptionist,
        SpaStaff,
        Manager,
    }

    public async Task<Pet> CreateAsync(CurrentUser user, PetInput input, Guid? requestedCustomerId, CancellationToken ct = default)
    {
        var actor = await ResolveActorAsync(user, ct);
        var customerId = actor switch
        {
            PetActor.Customer => await GetOwnCustomerIdAsync(user, ct),
            PetActor.Receptionist => await GetCustomerIdForReceptionistAsync(requestedCustomerId, ct),
            _ => throw new BusinessException(ErrorCodes.Forbidden),
        };

        var pet = new Pet { PetId = Guid.NewGuid(), CustomerId = customerId };
        Apply(pet, input);
        pet.DetermineSizeGroup(await pets.GetSizeRulesAsync(pet.Species, ct));

        pets.Add(pet);
        await pets.SaveChangesAsync(ct);
        return pet;
    }

    public async Task<PagedResult<Pet>> ListAsync(CurrentUser user, Guid? requestedCustomerId, int page, int pageSize, CancellationToken ct = default)
    {
        var actor = await ResolveActorAsync(user, ct);
        var customerId = actor switch
        {
            PetActor.Customer => await GetOwnCustomerIdAsync(user, ct),
            PetActor.Receptionist => await GetCustomerIdForReceptionistAsync(requestedCustomerId, ct),
            _ => throw new BusinessException(ErrorCodes.Forbidden),
        };

        var (items, total) = await pets.ListActiveByCustomerAsync(customerId, page, pageSize, ct);
        return new PagedResult<Pet>(items, page, pageSize, total);
    }

    public async Task<Pet> GetAsync(CurrentUser user, Guid petId, CancellationToken ct = default)
    {
        var actor = await ResolveActorAsync(user, ct);
        var found = await pets.FindWithOwnerAsync(petId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        switch (actor)
        {
            case PetActor.Customer:
                OwnershipGuard.EnsureOwner(user, found.OwnerUserId);
                break;
            case PetActor.SpaStaff:
                if (!await pets.IsAssignedToStaffAsync(petId, user.UserId, ct))
                    throw new BusinessException(ErrorCodes.Forbidden);
                break;
            case PetActor.Receptionist:
            case PetActor.Manager:
                break;
            default:
                throw new BusinessException(ErrorCodes.Forbidden);
        }

        return found.Pet;
    }

    public async Task<Pet> UpdateAsync(CurrentUser user, Guid petId, PetInput input, CancellationToken ct = default)
    {
        var actor = await ResolveActorAsync(user, ct);
        if (actor is not (PetActor.Customer or PetActor.Receptionist))
            throw new BusinessException(ErrorCodes.Forbidden);

        var found = await pets.FindWithOwnerAsync(petId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (actor == PetActor.Customer) OwnershipGuard.EnsureOwner(user, found.OwnerUserId);

        Apply(found.Pet, input);
        found.Pet.DetermineSizeGroup(await pets.GetSizeRulesAsync(found.Pet.Species, ct));

        await pets.SaveChangesAsync(ct);
        return found.Pet;
    }

    private async Task<PetActor> ResolveActorAsync(CurrentUser user, CancellationToken ct)
    {
        switch (user.Role)
        {
            case UserRole.Customer:
                return PetActor.Customer;
            case UserRole.Manager:
                return PetActor.Manager;
            case UserRole.Staff:
                var staffRole = await staffRoles.GetStaffRoleAsync(user.UserId, ct);
                return staffRole switch
                {
                    StaffRole.Receptionist => PetActor.Receptionist,
                    StaffRole.SpaStaff => PetActor.SpaStaff,
                    _ => throw new BusinessException(ErrorCodes.Forbidden),
                };
            default:
                throw new BusinessException(ErrorCodes.Forbidden);
        }
    }

    private async Task<Guid> GetOwnCustomerIdAsync(CurrentUser user, CancellationToken ct) =>
        await pets.FindCustomerIdByUserIdAsync(user.UserId, ct)
        ?? throw new BusinessException(ErrorCodes.Forbidden);

    private async Task<Guid> GetCustomerIdForReceptionistAsync(Guid? requestedCustomerId, CancellationToken ct)
    {
        if (requestedCustomerId is null || requestedCustomerId == Guid.Empty)
            throw new BusinessException(ErrorCodes.ValidationError, "Lễ tân phải chọn khách hàng (customerId).");

        if (!await pets.CustomerExistsAsync(requestedCustomerId.Value, ct))
            throw new BusinessException(ErrorCodes.ValidationError, "Khách hàng không tồn tại.");

        return requestedCustomerId.Value;
    }

    private static void Apply(Pet pet, PetInput input)
    {
        pet.Name = input.Name;
        pet.Species = input.Species;
        pet.Breed = input.Breed;
        pet.Temperament = input.Temperament ?? Temperament.Normal;
        pet.WeightKg = input.WeightKg;
        pet.HeightCm = input.HeightCm;
        pet.CoatNote = input.CoatNote;
        pet.Notes = input.Notes;
    }
}
