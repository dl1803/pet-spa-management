import { ApiError } from "@/lib/api/errors";
import type {
  ActualWeightRequest,
  CheckInResult,
  CostConfirmationRespondRequest,
  SizeGroup,
  StatusResult,
  WeightCheck,
  WeightCheckResponse,
} from "@/lib/api/types";
import type { CheckInData } from "@/features/reception-check-in/check-in";
import {
  createMockCheckInEntries,
  MOCK_CONFIRM_MINUTES,
  type MockCheckInEntry,
} from "@/features/reception-check-in/mock-data";

// Mô phỏng độ trễ mạng khi gọi API.
const MOCK_DELAY_MS = 500;
// Cân nặng đặc biệt để kiểm thử các kịch bản lỗi.
export const MOCK_WEIGHT_INVALID_TRANSITION = 77;
export const MOCK_WEIGHT_NETWORK_ERROR = 88;

const SIZE_RANK: Record<SizeGroup, number> = { Small: 0, Medium: 1, Large: 2 };

let store: Map<string, MockCheckInEntry> | null = null;

function getStore() {
  store ??= new Map(createMockCheckInEntries(new Date()).map((entry) => [entry.data.appointment.appointmentId, entry]));
  return store;
}

export function resetMockCheckInStore(now: Date = new Date()) {
  store = new Map(createMockCheckInEntries(now).map((entry) => [entry.data.appointment.appointmentId, entry]));
}

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function findEntry(appointmentId: string) {
  const entry = getStore().get(appointmentId);
  if (!entry) {
    throw new ApiError({ kind: "http", status: 404, code: "NOT_FOUND", title: "Không tìm thấy", detail: "Không tìm thấy dữ liệu, có thể đã bị thay đổi." });
  }
  return entry;
}

function conflict(code: string, detail: string) {
  return new ApiError({ kind: "http", status: 409, code, title: "Xung đột trạng thái", detail });
}

function classify(entry: MockCheckInEntry, kg: number): SizeGroup {
  if (kg <= entry.rule.smallMaxKg) return "Small";
  return kg <= entry.rule.mediumMaxKg ? "Medium" : "Large";
}

// Mô phỏng quy tắc đối chiếu:
// - Nặng hơn, vượt dung sai và sang nhóm lớn hơn -> NEEDS_CONFIRMATION
// - Nhẹ hơn và xuống nhóm nhỏ hơn -> PRICE_DECREASED
// - Còn lại -> OK (chênh bằng ngưỡng vẫn tính là trong ngưỡng)
function evaluate(entry: MockCheckInEntry, actualKg: number, now: Date): WeightCheck {
  const { appointment, pet } = entry.data;
  const current = appointment.sizeGroup;
  const next = classify(entry, actualKg);
  const { prices, toleranceKg } = entry.rule;
  if (actualKg > pet.weightKg && actualKg - pet.weightKg > toleranceKg && SIZE_RANK[next] > SIZE_RANK[current]) {
    return {
      result: "NEEDS_CONFIRMATION",
      newSizeGroup: next,
      oldAmount: prices[current],
      newAmount: prices[next],
      expiresAt: new Date(now.getTime() + MOCK_CONFIRM_MINUTES * 60_000).toISOString(),
    };
  }
  if (actualKg < pet.weightKg && SIZE_RANK[next] < SIZE_RANK[current]) {
    return { result: "PRICE_DECREASED", newSizeGroup: next, oldAmount: prices[current], newAmount: prices[next] };
  }
  return { result: "OK" };
}

function applyWeightCheck(entry: MockCheckInEntry, actualKg: number, weightCheck: WeightCheck) {
  const { appointment, pet } = entry.data;
  appointment.actualWeightKg = actualKg;
  if (weightCheck.result === "NEEDS_CONFIRMATION" && weightCheck.newSizeGroup && weightCheck.expiresAt) {
    appointment.pendingCostConfirmation = {
      actualWeightKg: actualKg,
      newSizeGroup: weightCheck.newSizeGroup,
      oldAmount: weightCheck.oldAmount ?? 0,
      newAmount: weightCheck.newAmount ?? 0,
      status: "Pending",
      expiresAt: weightCheck.expiresAt,
    };
    return;
  }
  pet.weightKg = actualKg;
  if (weightCheck.result === "PRICE_DECREASED" && weightCheck.newSizeGroup) {
    pet.sizeGroup = weightCheck.newSizeGroup;
    appointment.sizeGroup = weightCheck.newSizeGroup;
  }
}

// Tự động hủy lịch nếu yêu cầu xác nhận chi phí đã hết hạn.
function expireIfDue(entry: MockCheckInEntry, now: Date) {
  const { appointment } = entry.data;
  const pending = appointment.pendingCostConfirmation;
  if (pending == null || pending.status !== "Pending" || Date.parse(pending.expiresAt) > now.getTime()) return false;
  appointment.pendingCostConfirmation = null;
  appointment.status = "Cancelled";
  appointment.cancelReason = "CostNotConfirmed";
  appointment.cancelledAt = now.toISOString();
  return true;
}

function throwSpecialWeightFailure(actualKg: number) {
  if (actualKg === MOCK_WEIGHT_NETWORK_ERROR) throw new ApiError({ kind: "network" });
  if (actualKg === MOCK_WEIGHT_INVALID_TRANSITION) {
    throw conflict("INVALID_TRANSITION", "Đã quá thời gian giữ chỗ, lịch hẹn không thể tiếp nhận.");
  }
}

export async function mockGetCheckInData(appointmentId: string): Promise<CheckInData> {
  await wait();
  const entry = findEntry(appointmentId);
  expireIfDue(entry, new Date());
  return structuredClone(entry.data);
}

export async function mockCheckInSpa(appointmentId: string, request: ActualWeightRequest): Promise<CheckInResult> {
  await wait();
  throwSpecialWeightFailure(request.actualWeightKg);
  const entry = findEntry(appointmentId);
  const { appointment } = entry.data;
  if (appointment.type !== "Spa" || appointment.status !== "Confirmed") {
    throw conflict("INVALID_TRANSITION", "Lịch hẹn đã thay đổi trạng thái, vui lòng tải lại.");
  }
  const weightCheck = evaluate(entry, request.actualWeightKg, new Date());
  applyWeightCheck(entry, request.actualWeightKg, weightCheck);
  appointment.status = "Received";
  return { status: "Received", weightCheck };
}

export async function mockCheckWeight(appointmentId: string, request: ActualWeightRequest): Promise<WeightCheckResponse> {
  await wait();
  throwSpecialWeightFailure(request.actualWeightKg);
  const entry = findEntry(appointmentId);
  const { appointment } = entry.data;
  if (appointment.type !== "Hotel" || appointment.status !== "Confirmed") {
    throw conflict("INVALID_TRANSITION", "Lịch hẹn đã thay đổi trạng thái, vui lòng tải lại.");
  }
  if (appointment.pendingCostConfirmation != null) {
    throw conflict("COST_CONFIRMATION_PENDING", "Đang chờ khách xác nhận chi phí mới.");
  }
  const weightCheck = evaluate(entry, request.actualWeightKg, new Date());
  applyWeightCheck(entry, request.actualWeightKg, weightCheck);
  return { weightCheck };
}

export async function mockRespondCostConfirmation(
  appointmentId: string,
  request: CostConfirmationRespondRequest,
): Promise<StatusResult> {
  await wait();
  const entry = findEntry(appointmentId);
  const { appointment, pet } = entry.data;
  const pending = appointment.pendingCostConfirmation;
  if (pending == null || pending.status !== "Pending") {
    throw new ApiError({ kind: "http", status: 404, code: "NOT_FOUND", title: "Không tìm thấy", detail: "Không có yêu cầu xác nhận chi phí đang chờ." });
  }
  if (expireIfDue(entry, new Date())) {
    throw conflict("COST_CONFIRMATION_EXPIRED", "Yêu cầu xác nhận chi phí đã hết hạn.");
  }
  appointment.pendingCostConfirmation = null;
  if (request.accept) {
    pet.weightKg = pending.actualWeightKg;
    pet.sizeGroup = pending.newSizeGroup;
    appointment.sizeGroup = pending.newSizeGroup;
  } else {
    appointment.status = "Cancelled";
    appointment.cancelReason = "CostNotConfirmed";
    appointment.cancelledAt = new Date().toISOString();
  }
  return { status: appointment.status };
}
