import { apiClient } from "@/lib/api/client";
import type { CounterPaymentRequest, PaymentPage, PaymentStatus, PaymentStatusResult } from "@/lib/api/types";

// Chỉ khai báo tham số màn đang dùng (openapi status, Page, PageSize); API chưa có tham số kind, method (UI-Screens G-07).
export type ListPaymentsParams = {
  status?: PaymentStatus;
  page?: number;
  pageSize?: number;
};

// GET /payments (listPayments): chỉ Quản lý; lịch hẹn tạo mới nhất trước; page vượt quá số trang trả items rỗng kèm total.
export async function listPayments(params: ListPaymentsParams) {
  const { data } = await apiClient.get<PaymentPage>("/payments", { params });
  return data;
}

// POST /payments/{id}/counter (payAtCounter): Lễ tân hoặc Quản lý; chỉ gửi { method, receivedAmount }, không gửi amount.
// 200 { status: "Paid" }; 404 NOT_FOUND; 409 PAYMENT_NOT_DUE, AMOUNT_MISMATCH, COST_CONFIRMATION_PENDING.
export async function payAtCounter(paymentId: string, request: CounterPaymentRequest) {
  const { data } = await apiClient.post<PaymentStatusResult>(`/payments/${encodeURIComponent(paymentId)}/counter`, request);
  return data;
}
