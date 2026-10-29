using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Entities;

public class Staff
{
    public Guid StaffId { get; set; }
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public StaffRole StaffRole { get; set; }
}

