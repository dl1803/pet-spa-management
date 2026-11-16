using PetSpa.Domain.Exceptions;

namespace PetSpa.Domain.Services;

public static class ChangeWindow
{
    public static bool IsOpen(DateTimeOffset scheduledStart, DateTimeOffset now, int deadlineMinutes) =>
        scheduledStart - now >= TimeSpan.FromMinutes(deadlineMinutes);

    public static void EnsureOpen(DateTimeOffset scheduledStart, DateTimeOffset now, int deadlineMinutes)
    {
        if (!IsOpen(scheduledStart, now, deadlineMinutes))
            throw new BusinessException(ErrorCodes.ChangeWindowClosed);
    }
}
