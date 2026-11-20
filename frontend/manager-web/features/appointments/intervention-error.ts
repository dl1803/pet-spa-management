import { toApiError, type ApiError } from "@/lib/api/errors";

export type InterventionFailure =
  | { kind: "out-of-shift"; detail: string | null } // hỏi lại rồi gửi với confirmOutOfShift = true
  | { kind: "stale"; error: ApiError } // lịch đã đổi/không còn: toast lỗi, đóng hộp thoại
  | { kind: "field"; field: "time" | "staffIds"; message: string } // câu cố định của SA 6.6 dưới ô
  | { kind: "alert"; message: string } // Alert danger trong hộp thoại
  | { kind: "error"; error: ApiError }; // ErrorAlert với detail của backend

export function isStaleAppointmentError(error: unknown): boolean {
  const apiError = toApiError(error);
  const { status, code } = apiError;
  return (status === 409 && code === "INVALID_TRANSITION") || (status === 404 && code === "NOT_FOUND");
}

export function classifyRescheduleError(error: unknown, staffRequired: 1 | 2): InterventionFailure {
  const apiError = toApiError(error);
  const { status, code } = apiError;

  if (status === 409) {
    if (code === "STAFF_OUT_OF_SHIFT") {
      return { kind: "out-of-shift", detail: apiError.detail };
    }
    if (code === "SLOT_FULL") {
      return { kind: "field", field: "time", message: "Mốc giờ vừa kín, vui lòng chọn mốc khác." };
    }
    if (code === "STAFF_CONFLICT") {
      return { kind: "field", field: "staffIds", message: "Có nhân viên đã có lịch trùng khung giờ." };
    }
    if (code === "STAFF_COUNT_MISMATCH") {
      return { kind: "field", field: "staffIds", message: `Lịch này cần đúng ${staffRequired} nhân viên.` };
    }
    if (code === "NO_CAPACITY") {
      return { kind: "alert", message: "Hết chỗ trong thời gian này, vui lòng chọn ngày khác." };
    }
    if (code === "CAGE_CONFLICT") {
      return { kind: "alert", message: "Chuồng đã được gán trong thời gian này." };
    }
    if (code === "INVALID_TRANSITION") {
      return { kind: "stale", error: apiError };
    }
  }

  if (status === 404 && code === "NOT_FOUND") {
    return { kind: "stale", error: apiError };
  }

  return { kind: "error", error: apiError };
}
