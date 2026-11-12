import type { AppointmentStatus } from "@/lib/api/types";
import { canSelfChangeOrCancel } from "@/lib/appointments";
import { STORE_HOTLINE } from "@/lib/store-info";

// hidden: lịch đã hoàn tất hoặc đã hủy; locked: lịch đã tiếp nhận trở đi hoặc đã quá thời hạn (409).
export type ChangeCancelState = "available" | "locked" | "hidden";

// Không nêu số giờ vì web khách hàng không đọc được tham số cấu hình cửa hàng.
export const CHANGE_CANCEL_NOTE = `Bạn được tự đổi hoặc hủy miễn phí khi còn trong thời hạn trước giờ hẹn do cửa hàng quy định. Quá thời hạn, vui lòng liên hệ hotline ${STORE_HOTLINE}.`;

export const APPOINTMENT_CANCELLED_MESSAGE = "Đã hủy lịch hẹn";

export function getChangeCancelState(status: AppointmentStatus, isWindowClosed: boolean): ChangeCancelState {
  if (status === "Completed" || status === "Cancelled") return "hidden";
  return canSelfChangeOrCancel(status) && !isWindowClosed ? "available" : "locked";
}

