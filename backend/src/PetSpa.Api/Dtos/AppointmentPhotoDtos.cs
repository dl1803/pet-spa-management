using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed class UploadPhotoRequest
{
    public PhotoKind? Kind { get; set; }
    public IFormFile? File { get; set; }
}

public sealed record PhotoCreatedResponse(Guid PhotoId);
