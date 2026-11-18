import type { IconName } from "@/components/icons";
import { toApiError } from "@/lib/api/errors";
import type { AppointmentDetail, Payment, PaymentKind, Pet, SizeGroup, Species } from "@/lib/api/types";
import { formatShortDate, formatTime } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { getStoreDateKey } from "@/lib/time";

// Chuồng của lịch lưu trú, lấy từ GET /cages theo cageId của lịch.
export type CheckOutCage = { code: string; species: Species; sizeGroup: SizeGroup };

export type CheckOutData = {
  appointment: AppointmentDetail;
  pet: Pet;
  cage: CheckOutCage | null;
  // GET /appointments/{id}/payments: tối đa hai khoản (Stay, LateFee).
  payments: Payment[];
};

export const CHECK_OUT_QUERY_KEY = ["check-out"] as const;
export const CHECK_OUT_LIST_QUERY_KEY = [...CHECK_OUT_QUERY_KEY, "in-stay"] as const;

export const NOT_CHECK_OUT_STEP_MESSAGE = "Lịch này không còn ở bước trả thú cưng.";
export const LATE_FEE_LOCK_REASON = "Cần thu phí trả muộn trước khi hoàn tất.";

export function canCheckOut(appointment: AppointmentDetail) {
  return appointment.type === "Hotel" && appointment.status === "InStay";
}

export function findPayment(payments: Payment[], kind: PaymentKind): Payment | null {
  return payments.find((payment) => payment.kind === kind) ?? null;
}

export type CheckOutGate = { ready: true } | { ready: false; reason: string };

// Khóa nút xác nhận khi đã có khoản phí trả muộn nhưng chưa thanh toán.
export function getCheckOutGate(payments: Payment[]): CheckOutGate {
  const lateFee = findPayment(payments, "LateFee");
  if (lateFee !== null && lateFee.status !== "Paid") return { ready: false, reason: LATE_FEE_LOCK_REASON };
  return { ready: true };
}

// Số phút trễ so với giờ trả dự kiến, làm tròn đến phút; số âm là trả sớm; 0 khi giờ dự kiến không hợp lệ.
export function getMinutesLate(plannedCheckOut: string, nowMs: number) {
  const diff = nowMs - Date.parse(plannedCheckOut);
  return Number.isNaN(diff) ? 0 : Math.round(diff / 60_000);
}

export type LateNotice = { tone: "success" | "warn"; icon: IconName; title: string; body: string };

// Chỉ thông báo ước lượng để báo khách; số tiền phạt do hệ thống tính khi xác nhận, web không tự tính.
export function describeLateness(minutesLate: number): LateNotice {
  if (minutesLate > 0) {
    return {
      tone: "warn",
      icon: "timer",
      title: `Trễ ${minutesLate} phút so với giờ trả dự kiến`,
      body: "Phí trả muộn (nếu có) do hệ thống tính khi bạn xác nhận trả thú cưng.",
    };
  }
  return {
    tone: "success",
    icon: "check-circle",
    title: "Không tính phí trả muộn",
    body:
      minutesLate === 0
        ? "Đón đúng giờ trả dự kiến."
        : `Đón sớm ${-minutesLate} phút so với giờ trả dự kiến. Trả sớm không hoàn tiền.`,
  };
}

// "B1, mèo nhóm Vừa"
export function describeCage(cage: CheckOutCage) {
  return `${cage.code}, ${SPECIES_LABELS[cage.species].toLocaleLowerCase("vi-VN")} nhóm ${SIZE_GROUP_LABELS[cage.sizeGroup]}`;
}

// "18:00, 08/11"
export function formatReturnMoment(value: string) {
  return `${formatTime(value)}, ${formatShortDate(value)}`;
}

// "08/11, tiền mặt"; null khi khoản chưa có ngày thu lẫn phương thức.
export function describePaid(payment: Payment): string | null {
  const parts: string[] = [];
  if (payment.paidAt) parts.push(formatShortDate(payment.paidAt));
  if (payment.method) parts.push(PAYMENT_METHOD_LABELS[payment.method].toLocaleLowerCase("vi-VN"));
  return parts.length > 0 ? parts.join(", ") : null;
}

// Lịch Đang lưu trú có giờ trả dự kiến trong ngày todayKey, xếp theo giờ trả tăng dần.
export function selectTodayReturns(items: CheckOutData[], todayKey: string): CheckOutData[] {
  return items
    .filter(({ appointment }) => canCheckOut(appointment) && !!appointment.plannedCheckOut && getStoreDateKey(appointment.plannedCheckOut) === todayKey)
    .sort((a, b) => Date.parse(a.appointment.plannedCheckOut ?? "") - Date.parse(b.appointment.plannedCheckOut ?? ""));
}

export function isConflictError(error: unknown) {
  return toApiError(error).status === 409;
}

export function isNotFoundError(error: unknown) {
  return toApiError(error).status === 404;
}
