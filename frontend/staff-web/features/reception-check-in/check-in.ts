import type { IconName } from "@/components/icons";
import { toApiError } from "@/lib/api/errors";
import type { AppointmentDetail, CostConfirmation, Pet, SizeGroup, WeightCheck } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { SIZE_GROUP_LABELS } from "@/lib/labels";
import { formatKg, formatWeightDifference } from "@/features/reception-check-in/weight";

export type CheckInData = {
  appointment: AppointmentDetail;
  pet: Pet;
  cageCode: string | null;
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
