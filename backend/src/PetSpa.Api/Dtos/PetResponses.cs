using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record PetCreatedResponse(Guid PetId, SizeGroup SizeGroup);

