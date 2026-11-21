using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed class UploadPhotoRequest
{
    public PhotoKind? Kind { get; set; }
    public IFormFile? File { get; set; }
}

public sealed record PhotoCreatedResponse(Guid PhotoId);

public sealed record PhotoResponse(Guid PhotoId, PhotoKind Kind, string Url, DateTimeOffset UploadedAt)
{
    public static PhotoResponse From(AppointmentPhotoView view) =>
        new(view.PhotoId, view.Kind, view.Url, view.UploadedAt);
}
