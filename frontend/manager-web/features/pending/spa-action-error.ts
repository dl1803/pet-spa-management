import { toApiError, type ApiError } from "@/lib/api/errors";

// Cách màn MW-04 xử lý lỗi của xác nhận, từ chối lịch spa (UI-Screens MW-04, Frontend-Conventions 5.2).
export type SpaActionFailure =
  // Hộp thoại MW-04·D2: hỏi lại, đồng ý thì gửi lại với confirmOutOfShift = true.
  | { kind: "out-of-shift"; detail: string | null }
  // Lịch không còn chờ xác nhận hoặc không còn tồn tại: toast lỗi, vì lịch sẽ biến mất khỏi danh sách sau khi tải lại.
  | { kind: "stale"; error: ApiError }
  // Câu cố định của UI-Screens; resetSelection: bỏ lựa chọn tay để dùng lại đề xuất mới tải.
  | { kind: "message"; message: string; resetSelection: boolean }
  | { kind: "error"; error: ApiError };

export function classifySpaActionError(error: unknown, staffRequired: 1 | 2): SpaActionFailure {
  const apiError = toApiError(error);
  const { status, code } = apiError;

  if (status === 409 && code === "STAFF_OUT_OF_SHIFT") return { kind: "out-of-shift", detail: apiError.detail };
  if (status === 409 && code === "STAFF_CONFLICT") {
    return { kind: "message", message: "Có nhân viên đã có lịch trùng khung giờ.", resetSelection: true };
  }
  if (status === 409 && code === "STAFF_COUNT_MISMATCH") {
    return { kind: "message", message: `Lịch này cần đúng ${staffRequired} nhân viên.`, resetSelection: true };
  }
  if ((status === 409 && code === "INVALID_TRANSITION") || (status === 404 && code === "NOT_FOUND")) {
    return { kind: "stale", error: apiError };
  }
  return { kind: "error", error: apiError };
}
