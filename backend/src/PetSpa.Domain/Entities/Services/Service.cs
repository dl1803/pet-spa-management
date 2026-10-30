namespace PetSpa.Domain.Entities;

public class Service
{
    public Guid ServiceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TimeOnly LatestStartTime { get; set; }
    public bool IsActive { get; set; } = true;
}

