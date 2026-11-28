import type { CostConfirmation, WeightCheck } from "@/lib/api/types";

// Backend chưa trả pendingCostConfirmation ở GET /appointments/{id}.
// Sau lần đối chiếu cân nặng cho kết quả NEEDS_CONFIRMATION, phản hồi đã có đủ nhóm mới, số tiền và hạn phản hồi nên nhớ lại ở đây
// để màn Tiếp nhận vẫn hiện đồng hồ và nút ghi nhận phản hồi. Chỉ nằm trong bộ nhớ của tab: tải lại trang thì mất, đăng xuất tải lại trang nên không lẫn giữa tài khoản.
const remembered = new Map<string, CostConfirmation>();

// Số tiền, nhóm kích cỡ và hạn đều lấy từ backend; null khi kết quả không cần khách xác nhận hoặc thiếu trường.
export function toPendingCostConfirmation(actualWeightKg: number, weightCheck: WeightCheck): CostConfirmation | null {
  const { result, newSizeGroup, oldAmount, newAmount, expiresAt } = weightCheck;
  if (result !== "NEEDS_CONFIRMATION") return null;
  if (newSizeGroup == null || oldAmount == null || newAmount == null || expiresAt == null) return null;
  return { actualWeightKg, newSizeGroup, oldAmount, newAmount, status: "Pending", expiresAt };
}

export function rememberPendingCostConfirmation(appointmentId: string, actualWeightKg: number, weightCheck: WeightCheck) {
  const confirmation = toPendingCostConfirmation(actualWeightKg, weightCheck);
  if (confirmation !== null) remembered.set(appointmentId, confirmation);
}

export function forgetPendingCostConfirmation(appointmentId: string) {
  remembered.delete(appointmentId);
}

export function getRememberedPendingCostConfirmation(appointmentId: string) {
  return remembered.get(appointmentId) ?? null;
}
