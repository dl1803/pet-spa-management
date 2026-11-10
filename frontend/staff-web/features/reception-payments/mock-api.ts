import { ApiError } from "@/lib/api/errors";
import type { CounterPaymentRequest, PaymentStatusResult } from "@/lib/api/types";
import { createMockPaymentRows, MOCK_CONFIRMER_NAME } from "@/features/reception-payments/mock-data";
import type { CounterPaymentRow, CounterPaymentsData } from "@/features/reception-payments/payment";

// Mô phỏng độ trễ mạng khi gọi API.
const MOCK_DELAY_MS = 500;

let store: Map<string, CounterPaymentRow> | null = null;

function buildStore(now: Date) {
  return new Map(createMockPaymentRows(now).map((row) => [row.payment.paymentId, row]));
}

function getStore() {
  store ??= buildStore(new Date());
  return store;
}

export function resetMockPaymentStore(now: Date = new Date()) {
  store = buildStore(now);
}

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

// Thay cho: danh sách lịch trong ngày + GET /appointments/{id}/payments (giữ khoản Unpaid) + GET /me.
export async function mockListCounterPayments(): Promise<CounterPaymentsData> {
  await wait();
  const rows = [...getStore().values()].filter((row) => row.payment.status === "Unpaid");
  return { rows: structuredClone(rows), confirmerName: MOCK_CONFIRMER_NAME };
}

// Thay cho: POST /payments/{paymentId}/counter. Không nhận amount; số tiền phải trả lấy từ khoản đã lưu (BR-17).
export async function mockPayAtCounter(paymentId: string, request: CounterPaymentRequest): Promise<PaymentStatusResult> {
  await wait();
  const row = getStore().get(paymentId);
  if (!row) {
    throw new ApiError({ kind: "http", status: 404, code: "NOT_FOUND", title: "Không tìm thấy", detail: "Không tìm thấy khoản thanh toán." });
  }
  if (request.receivedAmount < row.payment.amount) {
    throw new ApiError({
      kind: "http",
      status: 409,
      code: "AMOUNT_MISMATCH",
      title: "Xung đột trạng thái",
      detail: "Số tiền nhận thấp hơn số tiền phải trả.",
    });
  }
  row.payment.status = "Paid";
  row.payment.method = request.method;
  row.payment.receivedAmount = request.receivedAmount;
  row.payment.paidAt = new Date().toISOString();
  return { status: "Paid" };
}
