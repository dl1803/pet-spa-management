import type { Gateway, Payment } from "@/lib/api/types";

// Backend chỉ hỗ trợ một cổng; gửi cổng khác bị 400 VALIDATION_ERROR (PaymentService.StartOnlineAsync).
export const ONLINE_PAYMENT_GATEWAY = "VNPAY" satisfies Gateway;

// Sau khi quay về từ cổng: hỏi lại khoản thanh toán tối đa 5 lần, cách 2 giây (UI-Screens CW-09, mục Trạng thái).
export const PAYMENT_RESULT_MAX_CHECKS = 5;
export const PAYMENT_RESULT_INTERVAL_MS = 2000;

export function findSpaPayment(payments: Payment[] | undefined): Payment | undefined {
  return payments?.find((payment) => payment.kind === "Spa");
}

export type PaymentResultState = "checking" | "success" | "failed";

// Kết quả do khoản thanh toán server trả về quyết định; chỉ coi là chưa thành công khi đã hỏi đủ số lần mà vẫn Chưa thanh toán.
export function getPaymentResultState(payment: Payment | undefined, checkCount: number): PaymentResultState {
  if (payment?.status === "Paid") return "success";
  return checkCount > PAYMENT_RESULT_MAX_CHECKS ? "failed" : "checking";
}

// paymentUrl backend trả được đưa thẳng vào window.location.assign nên chỉ chấp nhận địa chỉ https tuyệt đối.
export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

// Tham số cổng VNPAY gắn vào địa chỉ trả về: mã giao dịch, trùng txnRef backend trả khi khởi tạo.
export const GATEWAY_TXN_REF_PARAM = "vnp_TxnRef";

// Backend đặt một địa chỉ trả về cố định (không chứa appointmentId), nên trước khi chuyển sang cổng, web ghi nhớ
// appointmentId theo txnRef để trang trả về biết lịch hẹn nào vừa thanh toán. Chỉ lưu appointmentId (không phải token
// hay bí mật), chỉ trong sessionStorage của tab. Quyền xem lịch hẹn vẫn do backend kiểm tra (BR-16).
const TXN_APPOINTMENT_KEY_PREFIX = "ps_payment_txn:";
const TXN_REF_PATTERN = /^[A-Za-z0-9]{1,64}$/;

export function rememberPaymentAppointment(txnRef: string, appointmentId: string): void {
  if (!TXN_REF_PATTERN.test(txnRef)) return;
  try {
    window.sessionStorage.setItem(`${TXN_APPOINTMENT_KEY_PREFIX}${txnRef}`, appointmentId);
  } catch {
    // Trình duyệt chặn lưu trữ: trang trả về sẽ đưa khách về danh sách lịch hẹn.
  }
}

export function readPaymentAppointment(txnRef: string): string | null {
  if (!TXN_REF_PATTERN.test(txnRef)) return null;
  try {
    return window.sessionStorage.getItem(`${TXN_APPOINTMENT_KEY_PREFIX}${txnRef}`);
  } catch {
    return null;
  }
}

