import type { Gateway, Payment } from "@/lib/api/types";

// Backend chỉ hỗ trợ một cổng; gửi cổng khác bị 400 VALIDATION_ERROR (PaymentService.StartOnlineAsync).
export const ONLINE_PAYMENT_GATEWAY = "VNPAY" satisfies Gateway;

// Sau khi quay về từ cổng: hỏi lại khoản thanh toán tối đa 5 lần, cách 2 giây (UI-Screens CW-09, mục Trạng thái).
export const PAYMENT_RESULT_MAX_CHECKS = 5;
export const PAYMENT_RESULT_INTERVAL_MS = 2000;

export function findSpaPayment(payments: Payment[] | undefined): Payment | undefined {
  return payments?.find((payment) => payment.kind === "Spa");
}
