import { canCheckOut, type CheckOutData } from "@/features/reception-check-out/check-out";
import { createMockCheckOutEntries } from "@/features/reception-check-out/mock-data";
import { ApiError } from "@/lib/api/errors";
import type { CheckOutResult, Payment } from "@/lib/api/types";

// Mô phỏng độ trễ mạng khi gọi API.
const MOCK_DELAY_MS = 500;
// Chỉ dùng cho dữ liệu mô phỏng, thay cho mức phí do Quản lý thiết lập và phép tính của backend:
// trễ tới 30 phút miễn phí; từ phút thứ 31, mỗi 60 phút tính một lần.
export const MOCK_FREE_LATE_MINUTES = 30;
export const MOCK_LATE_BLOCK_MINUTES = 60;
export const MOCK_LATE_FEE_PER_BLOCK = 50_000;

let store: Map<string, CheckOutData> | null = null;

function toStore(entries: CheckOutData[]) {
  return new Map(entries.map((entry) => [entry.appointment.appointmentId, entry]));
}

function getStore() {
  store ??= toStore(createMockCheckOutEntries(new Date()));
  return store;
}

export function resetMockCheckOutStore(now: Date = new Date()) {
  store = toStore(createMockCheckOutEntries(now));
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

export function calculateMockLateFee(plannedCheckOut: string, now: Date) {
  const minutesLate = Math.round((now.getTime() - Date.parse(plannedCheckOut)) / 60_000);
  if (!(minutesLate > MOCK_FREE_LATE_MINUTES)) return 0;
  return Math.ceil((minutesLate - MOCK_FREE_LATE_MINUTES) / MOCK_LATE_BLOCK_MINUTES) * MOCK_LATE_FEE_PER_BLOCK;
}

// Thay cho GET /appointments/{id} + GET /appointments/{id}/payments + GET /cages (tìm chuồng theo cageId).
export async function mockGetCheckOutData(appointmentId: string): Promise<CheckOutData> {
  await wait();
  return structuredClone(findEntry(appointmentId));
}

// Thay cho GET /appointments?date=<hôm nay>&type=Hotel&status=InStay.
export async function mockListInStayAppointments(): Promise<CheckOutData[]> {
  await wait();
  return [...getStore().values()].filter(({ appointment }) => canCheckOut(appointment)).map((entry) => structuredClone(entry));
}

// Thay cho POST /appointments/{id}/check-out. Lần xác nhận đầu tiên của lịch trả muộn tạo khoản LateFee chưa thanh toán rồi
// từ chối bằng PAYMENT_NOT_DUE; sau khi khoản đó được thanh toán, lần xác nhận kế tiếp hoàn tất lịch và giải phóng chuồng.
export async function mockCheckOut(appointmentId: string, now: Date = new Date()): Promise<CheckOutResult> {
  await wait();
  const entry = findEntry(appointmentId);
  const { appointment } = entry;
  if (!canCheckOut(appointment)) {
    throw conflict("INVALID_TRANSITION", "Lịch hẹn đã thay đổi trạng thái, vui lòng tải lại.");
  }
  const stay = entry.payments.find((payment) => payment.kind === "Stay");
  if (stay && stay.status !== "Paid") {
    throw conflict("PAYMENT_NOT_DUE", "Tiền lưu trú chưa được thanh toán.");
  }
  let lateFee = entry.payments.find((payment) => payment.kind === "LateFee");
  if (!lateFee) {
    const amount = calculateMockLateFee(appointment.plannedCheckOut ?? "", now);
    if (amount > 0) {
      const created: Payment = {
        paymentId: crypto.randomUUID(),
        appointmentId,
        kind: "LateFee",
        amount,
        status: "Unpaid",
        method: null,
        receivedAmount: null,
        paidAt: null,
      };
      entry.payments.push(created);
      lateFee = created;
    }
  }
  if (lateFee && lateFee.status !== "Paid") {
    throw conflict("PAYMENT_NOT_DUE", "Phí trả muộn chưa được thanh toán.");
  }
  appointment.status = "Completed";
  appointment.actualCheckOut = now.toISOString();
  return lateFee ? { status: "Completed", lateFee: lateFee.amount } : { status: "Completed" };
}
