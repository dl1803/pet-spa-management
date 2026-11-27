import type { AppointmentType } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

export const COST_CONFIRMATION_EXPIRED_MESSAGE = "Yêu cầu xác nhận đã hết hạn.";

export const COST_REJECTED_MESSAGE = "Đã từ chối chi phí mới, lịch hẹn đã được hủy";

// Giây còn lại tới expiresAt (làm tròn lên, không âm; trả về 0 nếu chuỗi thời gian không hợp lệ).
export function getRemainingSeconds(expiresAt: string, nowMs: number) {
  const expiresMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresMs)) return 0;
  return Math.max(0, Math.ceil((expiresMs - nowMs) / 1000));
}

export function getCostAcceptedMessage(type: AppointmentType, newAmount: number, petName: string) {
  const next = type === "Spa" ? `Nhân viên sẽ tiếp tục chăm sóc ${petName}.` : `Cửa hàng sẽ tiếp tục chăm sóc ${petName}.`;
  return `Đã đồng ý chi phí mới ${formatMoney(newAmount)}. ${next}`;
}

// Đối tượng của hộp thoại từ chối, ví dụ “Lịch spa LH-1029 của Bông”.
export function getCostDialogSubject(type: AppointmentType, appointmentCode: string, petName: string) {
  return `Lịch ${type === "Spa" ? "spa" : "lưu trú"} ${appointmentCode} của ${petName}`;
}
