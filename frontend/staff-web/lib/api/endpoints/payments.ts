import { apiClient } from "@/lib/api/client";
import type { CounterPaymentRequest, Payment, PaymentStatusResult } from "@/lib/api/types";

// GET /appointments/{id}/payments (listAppointmentPayments): mọi khoản thanh toán của một lịch hẹn; Lễ tân xem được lịch của toàn cửa hàng.
// 403 nếu ngoài phạm vi, 404 nếu không có lịch.
export async function listAppointmentPayments(appointmentId: string) {
  const { data } = await apiClient.get<Payment[]>(`/appointments/${encodeURIComponent(appointmentId)}/payments`);
  return data;
}

// POST /payments/{id}/counter (payAtCounter): Lễ tân gửi { method, receivedAmount }, không gửi amount (BR-17); 200 { status: "Paid" }.
// 400 VALIDATION_ERROR; 404 NOT_FOUND; 409 PAYMENT_NOT_DUE (sai thời điểm hoặc đã thanh toán), AMOUNT_MISMATCH, COST_CONFIRMATION_PENDING.
export async function payAtCounter(paymentId: string, request: CounterPaymentRequest) {
  const { data } = await apiClient.post<PaymentStatusResult>(`/payments/${encodeURIComponent(paymentId)}/counter`, request);
  return data;
}
