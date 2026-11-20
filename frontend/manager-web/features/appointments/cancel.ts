import type { Appointment, ManagerCancelReason } from "@/lib/api/types";

export const CANCEL_REASON_OPTIONS: { value: ManagerCancelReason; label: string; hint: string }[] = [
  {
    value: "StoreUnable",
    label: "Cửa hàng không thể đáp ứng",
    hint: "Nếu đã có khoản Đã thanh toán, cửa hàng hoàn 100%, xử lý ngoài hệ thống.",
  },
  {
    value: "CustomerBeyondDeadline",
    label: "Theo yêu cầu của khách, ngoài thời hạn tự hủy",
    hint: "Khoản đã thanh toán (nếu có) không hoàn lại.",
  },
];

// Trạng thái còn hủy được (vòng đời backend; BR-24): spa Pending, Confirmed, Received, InProgress; lưu trú Pending, Confirmed, InStay.
export function canCancelAppointment(appointment: Pick<Appointment, "type" | "status">): boolean {
  const { type, status } = appointment;
  if (type === "Spa") {
    return status === "Pending" || status === "Confirmed" || status === "Received" || status === "InProgress";
  }
  return status === "Pending" || status === "Confirmed" || status === "InStay";
}

export const CANCEL_MESSAGES = {
  reasonRequired: "Vui lòng chọn lý do hủy.",
  success: "Đã hủy lịch hẹn và gửi thông báo.",
} as const;
