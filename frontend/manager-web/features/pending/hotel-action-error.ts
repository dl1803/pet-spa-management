import { toApiError, type ApiError } from "@/lib/api/errors";

// Cách màn MW-04 xử lý lỗi của xác nhận, từ chối lịch lưu trú (UI-Screens MW-04, Frontend-Conventions 5.2).
export type HotelActionFailure =
  // Lịch không còn chờ xác nhận hoặc không còn tồn tại: toast lỗi, vì lịch sẽ biến mất khỏi danh sách sau khi tải lại.
  | { kind: "stale"; error: ApiError }
  // Câu cố định của UI-Screens; resetSelection: bỏ lựa chọn tay để dùng lại đề xuất mới tải.
  | { kind: "message"; message: string; resetSelection: boolean }
  | { kind: "error"; error: ApiError };

export function classifyHotelActionError(error: unknown): HotelActionFailure {
  const apiError = toApiError(error);
  const { status, code } = apiError;

  if (status === 409 && code === "CAGE_CONFLICT") {
    return { kind: "message", message: "Chuồng đã được gán trong thời gian này.", resetSelection: true };
  }
  if ((status === 409 && code === "INVALID_TRANSITION") || (status === 404 && code === "NOT_FOUND")) {
    return { kind: "stale", error: apiError };
  }
  return { kind: "error", error: apiError };
}
