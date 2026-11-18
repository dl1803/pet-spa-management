import type { IconName } from "@/components/icons";
import { toApiError } from "@/lib/api/errors";
import type { AppointmentDetail, CostConfirmation, Payment, Pet, SizeGroup, WeightCheck } from "@/lib/api/types";
import { formatMoney, formatShortDate } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, SIZE_GROUP_LABELS } from "@/lib/labels";
import { countNights } from "@/lib/time";
import { formatKg, formatWeightDifference } from "@/features/reception-check-in/weight";

// Đơn giá lưu trú mỗi đêm của nhóm kích cỡ đang áp dụng, chỉ để giải thích công thức (số tiền thu là payment.amount).
export type StayRate = { pricePerNight: number; foodPerNight: number };

// Khoản tiền lưu trú (kind = Stay) của lịch lưu trú; null với lịch spa.
export type StayCharge = { payment: Payment; rate: StayRate };

export type CheckInData = {
  appointment: AppointmentDetail;
  pet: Pet;
  cageCode: string | null;
  stay: StayCharge | null;
};

export const CHECK_IN_QUERY_KEY = ["check-in"] as const;

export const NOT_CHECK_IN_STEP_MESSAGE = "Lịch này không còn ở bước tiếp nhận.";

export type CheckInPanel =
  | { kind: "form" }
  | { kind: "pending"; confirmation: CostConfirmation }
  | { kind: "recorded"; actualWeightKg: number | null }
  | { kind: "unavailable" };

export function getCheckInPanel(appointment: AppointmentDetail): CheckInPanel {
  const confirmation = appointment.pendingCostConfirmation;
  if (confirmation != null && confirmation.status === "Pending") return { kind: "pending", confirmation };

  const actualWeightKg = appointment.actualWeightKg ?? null;
  if (appointment.type === "Spa") {
    if (appointment.status === "Confirmed") return { kind: "form" };
    if (appointment.status === "Received") return { kind: "recorded", actualWeightKg };
    return { kind: "unavailable" };
  }
  // Lịch lưu trú: bước đối chiếu cân nặng hoàn thành khi đã có actualWeightKg.
  if (appointment.status !== "Confirmed") return { kind: "unavailable" };
  return actualWeightKg === null ? { kind: "form" } : { kind: "recorded", actualWeightKg };
}

// Giây còn lại tới expiresAt (làm tròn lên và không âm).
export function getRemainingSeconds(expiresAt: string, nowMs: number) {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - nowMs) / 1000));
}

export type WeightOutcome = {
  weightCheck: WeightCheck;
  actualWeightKg: number;
  declaredWeightKg: number;
  previousSizeGroup: SizeGroup;
};

export type WeightNotice = {
  tone: "success" | "neutral";
  icon: IconName;
  title: string;
  body: string;
};

// Thông báo kết quả OK và PRICE_DECREASED (NEEDS_CONFIRMATION hiển thị ở khối cảnh báo riêng).
export function describeWeightOutcome(outcome: WeightOutcome, isSpa: boolean): WeightNotice | null {
  const { weightCheck, actualWeightKg, declaredWeightKg, previousSizeGroup } = outcome;
  if (weightCheck.result === "OK") {
    return {
      tone: "success",
      icon: "check-circle",
      title: "Trong ngưỡng dung sai, chi phí không đổi",
      body: `Chênh ${formatWeightDifference(actualWeightKg, declaredWeightKg)}, vẫn thuộc nhóm ${SIZE_GROUP_LABELS[previousSizeGroup]}. Hồ sơ cập nhật cân nặng ${formatKg(actualWeightKg)}.`,
    };
  }
  if (weightCheck.result === "PRICE_DECREASED" && weightCheck.newSizeGroup && weightCheck.oldAmount !== undefined && weightCheck.newAmount !== undefined) {
    const amounts = `Chi phí giảm từ ${formatMoney(weightCheck.oldAmount)} xuống ${formatMoney(weightCheck.newAmount)}.`;
    return {
      tone: "neutral",
      icon: "scale",
      title: `Cân nặng giảm, xuống nhóm ${SIZE_GROUP_LABELS[weightCheck.newSizeGroup]}`,
      body: `Hồ sơ cập nhật ${formatKg(actualWeightKg)}. ${amounts}${isSpa ? " Khung giờ giữ nguyên." : ""}`,
    };
  }
  return null;
}

export function isConflictError(error: unknown) {
  return toApiError(error).status === 409;
}

export function isCostConfirmationPendingError(error: unknown) {
  const { status, code } = toApiError(error);
  return status === 409 && code === "COST_CONFIRMATION_PENDING";
}

export function isNotFoundError(error: unknown) {
  return toApiError(error).status === 404;
}

export const WEIGHT_STEP_LOCK_REASON = "Cần đối chiếu cân nặng trước.";
export const COST_PENDING_LOCK_REASON = "Đang chờ khách xác nhận chi phí mới.";
export const STAY_UNPAID_LOCK_REASON = "Cần thu tiền lưu trú trước khi tiếp nhận.";

export type HotelCheckInGate = { ready: true } | { ready: false; reason: string };

// Điều kiện bật nút "Xác nhận tiếp nhận" của lịch lưu trú; lý do hiển thị là điều kiện đầu tiên chưa đạt.
export function getHotelCheckInGate(data: CheckInData): HotelCheckInGate {
  const panel = getCheckInPanel(data.appointment);
  if (panel.kind === "unavailable") return { ready: false, reason: NOT_CHECK_IN_STEP_MESSAGE };
  if (panel.kind === "pending") return { ready: false, reason: COST_PENDING_LOCK_REASON };
  if (panel.kind === "form") return { ready: false, reason: WEIGHT_STEP_LOCK_REASON };
  if (data.stay?.payment.status !== "Paid") return { ready: false, reason: STAY_UNPAID_LOCK_REASON };
  return { ready: true };
}

// "2 đêm × (100.000đ + 25.000đ)"; null khi lịch chưa có đủ mốc nhận và trả dự kiến.
export function describeStayFormula(appointment: AppointmentDetail, stay: StayCharge): string | null {
  if (!appointment.plannedCheckIn || !appointment.plannedCheckOut) return null;
  const nights = countNights(appointment.plannedCheckIn, appointment.plannedCheckOut);
  const { pricePerNight, foodPerNight } = stay.rate;
  return `${nights} đêm × (${formatMoney(pricePerNight)} + ${formatMoney(foodPerNight)})`;
}

// "08/11, tiền mặt"; null khi khoản chưa có ngày thu lẫn phương thức.
export function describeStayPaid(payment: Payment): string | null {
  const parts: string[] = [];
  if (payment.paidAt) parts.push(formatShortDate(payment.paidAt));
  if (payment.method) parts.push(PAYMENT_METHOD_LABELS[payment.method].toLocaleLowerCase("vi-VN"));
  return parts.length > 0 ? parts.join(", ") : null;
}

export function isPaymentNotDueError(error: unknown) {
  const { status, code } = toApiError(error);
  return status === 409 && code === "PAYMENT_NOT_DUE";
}
