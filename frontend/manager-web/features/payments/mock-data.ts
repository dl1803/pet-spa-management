import { ApiError } from "@/lib/api/errors";
import type { CounterPaymentRequest, PaymentKind, PaymentMethod } from "@/lib/api/types";
import { FORM_MESSAGES } from "./forms";
import type { PaymentRow, PaymentRowPage, PaymentStatusFilter } from "./list";

// Dữ liệu mô phỏng theo UI demo (MW-10), đúng hình dạng Payment của GET /payments; tên thú cưng, khách là phần
// hiển thị thêm (UI-Screens G-07). Mã lịch hiển thị là 8 ký tự đầu của appointmentId nên số lịch ở đây chỉ để đánh số.
// Thay bằng dữ liệu API thật khi nối backend.
const appointmentId = (n: number) => `5f1c${n.toString(16).padStart(4, "0")}-7e44-4c0a-9d21-0a1b2c3d4e00`;
const paymentId = (n: number) => `9e3b${n.toString(16).padStart(4, "0")}-2a6d-4b18-8c35-6d7e8f9a0b00`;

type PaidTuple = [
  appointmentNo: number,
  petName: string,
  customerName: string,
  kind: PaymentKind,
  amount: number,
  method: PaymentMethod,
  paidAt: string,
];

// Khoản đã thanh toán, mới nhất trước. Thanh toán trực tuyến chỉ có ở khoản spa (BR-09).
const PAID: PaidTuple[] = [
  [998, "Bi", "Hồ Thanh Tâm", "Spa", 150000, "Online", "2026-10-05T16:42:00+07:00"],
  [996, "Na", "Châu Bảo Trân", "Spa", 240000, "BankQR", "2026-10-05T11:35:00+07:00"],
  [990, "Bơ", "Trương Hoài Nam", "Stay", 540000, "Cash", "2026-10-05T09:12:00+07:00"],
  [989, "Kem", "Lý Thảo", "Stay", 500000, "BankQR", "2026-10-05T08:40:00+07:00"],
  [1003, "Tuyết", "Nguyễn Hải Yến", "Stay", 420000, "Cash", "2026-10-04T08:04:00+07:00"],
  [971, "Mực", "Đoàn Văn Khoa", "LateFee", 100000, "Cash", "2026-10-03T20:10:00+07:00"],
  [985, "Nho", "Lê Thu Trang", "Spa", 180000, "Online", "2026-10-03T15:20:00+07:00"],
  [984, "Đậu", "Phan Quốc Bảo", "Spa", 320000, "Cash", "2026-10-03T10:45:00+07:00"],
  [978, "Susu", "Võ Mai Anh", "Stay", 480000, "BankQR", "2026-10-02T17:30:00+07:00"],
  [977, "Mít", "Đỗ Gia Huy", "Spa", 210000, "Online", "2026-10-02T14:05:00+07:00"],
  [969, "Xíu", "Bùi Thanh Hương", "Spa", 140000, "Cash", "2026-10-02T09:50:00+07:00"],
  [966, "Gấu", "Ngô Minh Quân", "Stay", 600000, "Cash", "2026-10-01T18:15:00+07:00"],
  [962, "Lúa", "Hoàng Ngọc Diệp", "LateFee", 50000, "BankQR", "2026-10-01T12:20:00+07:00"],
  [959, "Tép", "Trịnh Hải Nam", "Spa", 170000, "Online", "2026-09-30T16:10:00+07:00"],
  [955, "Sữa", "Lương Bích Ngọc", "Spa", 260000, "Cash", "2026-09-30T11:00:00+07:00"],
  [951, "Cải", "Mai Văn Tuấn", "Stay", 360000, "BankQR", "2026-09-29T08:25:00+07:00"],
  [948, "Bắp", "Phạm Khánh Vy", "Spa", 150000, "Cash", "2026-09-28T15:40:00+07:00"],
  [944, "Chip", "Đinh Quang Vinh", "Stay", 450000, "Cash", "2026-09-27T09:05:00+07:00"],
  [941, "Kiwi", "Tạ Phương Thảo", "Spa", 230000, "Online", "2026-09-26T13:30:00+07:00"],
  [938, "Ú", "Lâm Hoàng Long", "Spa", 190000, "BankQR", "2026-09-25T10:10:00+07:00"],
  [935, "Pi", "Cao Thị Hồng", "Stay", 390000, "Cash", "2026-09-24T08:50:00+07:00"],
  [931, "Bống", "Dương Anh Khoa", "Spa", 160000, "Cash", "2026-09-23T16:35:00+07:00"],
];

// 2 khoản chưa thanh toán đứng đầu như UI demo, rồi các khoản đã thanh toán; tổng 24 khoản nên có trang 2.
export const MOCK_PAYMENTS: PaymentRow[] = [
  {
    paymentId: paymentId(1),
    appointmentId: appointmentId(1026),
    kind: "Stay",
    amount: 250000,
    status: "Unpaid",
    petName: "Cốm",
    customerName: "Phạm Quốc Huy",
  },
  {
    paymentId: paymentId(2),
    appointmentId: appointmentId(1035),
    kind: "Stay",
    amount: 440000,
    status: "Unpaid",
    petName: "Bông",
    customerName: "Trần Minh Anh",
  },
  ...PAID.map(([appointmentNo, petName, customerName, kind, amount, method, paidAt], index): PaymentRow => ({
    paymentId: paymentId(index + 3),
    appointmentId: appointmentId(appointmentNo),
    kind,
    amount,
    status: "Paid",
    method,
    receivedAmount: amount,
    paidAt,
    petName,
    customerName,
  })),
];

// Mô phỏng GET /payments?status=&page=&pageSize=: lọc theo trạng thái, rồi cắt trang.
export function getMockPaymentPage(
  payments: PaymentRow[],
  { status, page, pageSize }: { status: PaymentStatusFilter; page: number; pageSize: number },
): PaymentRowPage {
  const matched = status === "all" ? payments : payments.filter((payment) => payment.status === status);
  const start = (page - 1) * pageSize;
  return { page, pageSize, total: matched.length, items: matched.slice(start, start + pageSize) };
}

// Mô phỏng POST /payments/{id}/counter. Ném ApiError giống API thật (openapi payAtCounter) để CounterPaymentDialog
// xử lý một cách duy nhất khi nối backend: 404 NOT_FOUND; 409 AMOUNT_MISMATCH khi số tiền nhận thấp hơn `amount`.
// Thành công: Paid, ghi phương thức, số tiền nhận và thời điểm; `amount` giữ nguyên (backend không nhận từ client).
// Mô phỏng không kiểm tra thời điểm theo BR-07 (PAYMENT_NOT_DUE) và chờ xác nhận chi phí (COST_CONFIRMATION_PENDING).
export function recordMockCounterPayment(
  current: PaymentRow[],
  targetId: string,
  request: CounterPaymentRequest,
  paidAt: string,
): PaymentRow[] {
  const target = current.find((payment) => payment.paymentId === targetId);
  if (!target) {
    throw new ApiError({
      kind: "http",
      status: 404,
      code: "NOT_FOUND",
      title: "Không tìm thấy dữ liệu, có thể đã bị thay đổi.",
    });
  }
  if (request.receivedAmount < target.amount) {
    throw new ApiError({
      kind: "http",
      status: 409,
      code: "AMOUNT_MISMATCH",
      title: FORM_MESSAGES.receivedAmountInsufficient,
    });
  }
  return current.map((payment) =>
    payment.paymentId === targetId
      ? { ...payment, status: "Paid", method: request.method, receivedAmount: request.receivedAmount, paidAt }
      : payment,
  );
}
