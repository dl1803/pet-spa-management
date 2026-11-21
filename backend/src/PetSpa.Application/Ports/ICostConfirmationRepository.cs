using PetSpa.Domain.Entities;

namespace PetSpa.Application.Ports;

public interface ICostConfirmationRepository
{
    Task<int> GetTimeoutMinutesAsync(CancellationToken ct = default);

    Task<bool> HasPendingAsync(Guid appointmentId, CancellationToken ct = default);

    void Add(CostConfirmation confirmation);
}

