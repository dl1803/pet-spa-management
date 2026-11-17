using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record ConfirmAppointmentRequest(List<Guid>? StaffIds, bool ConfirmOutOfShift = false);
