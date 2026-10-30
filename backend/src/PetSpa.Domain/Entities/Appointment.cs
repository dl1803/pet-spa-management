using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Entities;

public abstract class Appointment
{
    public Guid AppointmentId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid PetId { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;
    public CancelReason? CancelReason { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public SizeGroup SizeGroup { get; set; }
    public decimal? ActualWeightKg { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

