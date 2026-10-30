using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Entities;

public class AppointmentPhoto
{
    public Guid PhotoId { get; set; }
    public Guid AppointmentId { get; set; }
    public PhotoKind Kind { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public Guid UploadedByStaffId { get; set; }
    public DateTimeOffset UploadedAt { get; set; }
}

