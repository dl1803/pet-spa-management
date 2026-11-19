import { ApiError } from "@/lib/api/errors";
import type { OnlinePaymentCreated, OnlinePaymentRequest, Payment } from "@/lib/api/types";
import { FOREIGN_APPOINTMENT_ID, getMockAppointmentsSnapshot } from "@/lib/mock-appointments";
import { MOCK_PAYMENTS } from "@/lib/mock-data";
import { ONLINE_PAYMENT_GATEWAY } from "@/lib/payments";
import { PAYMENT_RETURN_PARAM, PAYMENT_RETURN_VALUE, ROUTES, withQuery } from "@/lib/routes";

// Dữ liệu giả cho khoản thanh toán của lịch hẹn và thanh toán trực tuyến, đóng vai server.
// Chờ nối API thật: GET /appointments/{appointmentId}/payments, POST /payments/{paymentId}/online.
// Khoản thanh toán giữ trong bộ nhớ trình duyệt; tải lại trang thì trở về dữ liệu ban đầu.
//
// Đọc khoản thanh toán:
//   FOREIGN_APPOINTMENT_ID -> 403 FORBIDDEN · lịch hẹn không tồn tại -> 404 NOT_FOUND.
// Khởi tạo thanh toán trực tuyến:
//   cổng khác VNPAY -> 400 VALIDATION_ERROR · khoản không tồn tại -> 404 NOT_FOUND
//   khoản không phải khoản Spa, đã thanh toán hoặc lịch chưa Hoàn tất -> 409 PAYMENT_NOT_DUE.
//   Hợp lệ -> trả paymentUrl về chi tiết lịch hẹn kèm ?payment=return (mô phỏng cổng đã chuyển khách về).
// Mô phỏng webhook của cổng:
//   lần khởi tạo đầu tiên của một khoản: cổng không xác nhận, khoản vẫn Chưa thanh toán.
//   từ lần thứ hai: khoản chuyển Đã thanh toán (Trực tuyến) sau 3 giây kể từ lúc khởi tạo.
// Khoản chưa thanh toán dùng thử: a0000000-0000-4000-8000-000000000005 (lịch 2b8e5f04-0000-4000-8000-000000000010).

const MOCK_DELAY_MS = 600;
const WEBHOOK_DELAY_MS = 3000;

type MockTransaction = { createdAt: number; succeeds: boolean };

let payments: Payment[] = MOCK_PAYMENTS.map((payment) => ({ ...payment }));
const attemptCounts = new Map<string, number>();
const transactions = new Map<string, MockTransaction>();

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function notFound() {
  return new ApiError({
    kind: "http",
    status: 404,
    code: "NOT_FOUND",
    title: "Không tìm thấy dữ liệu",
    detail: "Không tìm thấy dữ liệu, có thể đã bị thay đổi.",
  });
}

function forbidden() {
  return new ApiError({
    kind: "http",
    status: 403,
    code: "FORBIDDEN",
    title: "Không có quyền",
    detail: "Bạn không có quyền thực hiện thao tác này.",
  });
}

function unsupportedGateway() {
  return new ApiError({
    kind: "http",
    status: 400,
    code: "VALIDATION_ERROR",
    title: "Dữ liệu không hợp lệ",
    detail: "Cổng thanh toán không được hỗ trợ.",
  });
}

function paymentNotDue() {
  return new ApiError({
    kind: "http",
    status: 409,
    code: "PAYMENT_NOT_DUE",
    title: "Sai thời điểm thanh toán",
    detail: "Chưa đến thời điểm thanh toán hoặc khoản thanh toán cần thiết chưa được thanh toán.",
  });
}

// Giao dịch thành công chỉ được ghi nhận Đã thanh toán sau WEBHOOK_DELAY_MS, như webhook đến sau khi khách quay về.
function settleTransactions() {
  const now = Date.now();
  for (const [paymentId, transaction] of transactions) {
    if (!transaction.succeeds || now - transaction.createdAt < WEBHOOK_DELAY_MS) continue;
    payments = payments.map(
      (payment): Payment =>
        payment.paymentId === paymentId
          ? {
              ...payment,
              status: "Paid",
              method: "Online",
              receivedAmount: payment.amount,
              paidAt: new Date(now).toISOString(),
            }
          : payment,
    );
    transactions.delete(paymentId);
  }
}

export async function mockListAppointmentPayments(appointmentId: string): Promise<Payment[]> {
  await wait();
  if (appointmentId === FOREIGN_APPOINTMENT_ID) throw forbidden();
  if (!getMockAppointmentsSnapshot().some((appointment) => appointment.appointmentId === appointmentId)) {
    throw notFound();
  }
  settleTransactions();
  return payments.filter((payment) => payment.appointmentId === appointmentId).map((payment) => ({ ...payment }));
}

export async function mockPayOnline(paymentId: string, request: OnlinePaymentRequest): Promise<OnlinePaymentCreated> {
  await wait();
  if (request.gateway !== ONLINE_PAYMENT_GATEWAY) throw unsupportedGateway();
  settleTransactions();

  const payment = payments.find((item) => item.paymentId === paymentId);
  if (!payment) throw notFound();
  const appointment = getMockAppointmentsSnapshot().find((item) => item.appointmentId === payment.appointmentId);
  if (
    !appointment ||
    appointment.type !== "Spa" ||
    appointment.status !== "Completed" ||
    payment.kind !== "Spa" ||
    payment.status !== "Unpaid"
  ) {
    throw paymentNotDue();
  }

  const attempt = (attemptCounts.get(paymentId) ?? 0) + 1;
  attemptCounts.set(paymentId, attempt);
  transactions.set(paymentId, { createdAt: Date.now(), succeeds: attempt > 1 });

  return {
    paymentUrl: withQuery(ROUTES.appointmentDetail(payment.appointmentId), {
      [PAYMENT_RETURN_PARAM]: PAYMENT_RETURN_VALUE,
    }),
    txnRef: `MOCK${Date.now()}${attempt}`,
  };
}
