namespace PetSpa.Domain.Exceptions;

public static class ErrorCodes
{
    // 400
    public const string ValidationError = "VALIDATION_ERROR";

    // 401
    public const string Unauthenticated = "UNAUTHENTICATED";

    // 403
    public const string Forbidden = "FORBIDDEN";
    public const string BookingLocked = "BOOKING_LOCKED";

    // 404
    public const string NotFound = "NOT_FOUND";

    // 409
    public const string DuplicateContact = "DUPLICATE_CONTACT";
    public const string SlotFull = "SLOT_FULL";
    public const string NoCapacity = "NO_CAPACITY";
    public const string StaffConflict = "STAFF_CONFLICT";
    public const string CageConflict = "CAGE_CONFLICT";
    public const string InvalidTransition = "INVALID_TRANSITION";
    public const string ChangeWindowClosed = "CHANGE_WINDOW_CLOSED";
    public const string PhotoRequired = "PHOTO_REQUIRED";
    public const string ServicesIncomplete = "SERVICES_INCOMPLETE";
    public const string StaffCountMismatch = "STAFF_COUNT_MISMATCH";
    public const string ShiftOverlap = "SHIFT_OVERLAP";
    public const string ShiftHasAppointments = "SHIFT_HAS_APPOINTMENTS";
    public const string CostConfirmationPending = "COST_CONFIRMATION_PENDING";
    public const string PaymentNotDue = "PAYMENT_NOT_DUE";
    public const string AmountMismatch = "AMOUNT_MISMATCH";
    public const string StaffOutOfShift = "STAFF_OUT_OF_SHIFT";
    public const string CustomerNotLocked = "CUSTOMER_NOT_LOCKED";
    public const string DuplicateCageCode = "DUPLICATE_CAGE_CODE";
    public const string CostConfirmationExpired = "COST_CONFIRMATION_EXPIRED";

    // 429
    public const string RateLimited = "RATE_LIMITED";
}

