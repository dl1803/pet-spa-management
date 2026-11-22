import { apiClient } from "@/lib/api/client";
import type { OnlinePaymentCreated, OnlinePaymentRequest, Payment } from "@/lib/api/types";

// GET /appointments/{id}/payments: các khoản thanh toán của một lịch hẹn. Spa có một khoản (Spa).
// Lịch của khách khác trả 403 FORBIDDEN, không tìm thấy trả 404 NOT_FOUND.
export async function listAppointmentPayments(appointmentId: string) {
  const { data } = await apiClient.get<Payment[]>(`/appointments/${encodeURIComponent(appointmentId)}/payments`);
  return data;
}

// POST /payments/{id}/online: khởi tạo thanh toán trực tuyến, trả địa chỉ chuyển khách sang cổng (200).
// Số tiền do backend xác định, không gửi từ web. Lỗi: 400 VALIDATION_ERROR (cổng không hỗ trợ), 403, 404,
// 409 PAYMENT_NOT_DUE (sai thời điểm hoặc khoản không còn chờ thanh toán).
export async function payOnline(paymentId: string, request: OnlinePaymentRequest) {
  const { data } = await apiClient.post<OnlinePaymentCreated>(`/payments/${encodeURIComponent(paymentId)}/online`, request);
  return data;
}
