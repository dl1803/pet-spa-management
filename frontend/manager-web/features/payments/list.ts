import type { Payment, PaymentKind, PaymentMethod, PaymentPage, PaymentStatus } from "@/lib/api/types";
import { formatAppointmentCode, formatShortDate, formatTime, lowerFirst } from "@/lib/format";
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";

// Số khoản mỗi trang của bảng (Frontend-Conventions 8).
export const PAYMENT_PAGE_SIZE = 20;

// Khoản thanh toán kèm tên hiển thị. API chưa trả tên thú cưng và khách (UI-Screens G-07) nên cả hai đều tùy chọn;
// thiếu thì bảng và hộp thoại bỏ phần tên.
export type PaymentRow = Payment & { petName?: string; customerName?: string };

export type PaymentRowPage = Omit<PaymentPage, "items"> & { items: PaymentRow[] };

export type PaymentStatusFilter = "all" | PaymentStatus;
export type PaymentKindFilter = "all" | PaymentKind;
export type PaymentMethodFilter = "all" | PaymentMethod;

// Thứ tự hiển thị trong ô chọn (UI demo MW-10).
export const PAYMENT_KIND_ORDER: PaymentKind[] = ["Spa", "Stay", "LateFee"];
export const PAYMENT_METHOD_ORDER: PaymentMethod[] = ["Cash", "BankQR", "Online"];

// Giá trị lạ hoặc thiếu trên URL coi như “Tất cả”.
function parseOption<T extends string>(value: string | null, options: readonly T[]): T | "all" {
  return options.find((option) => option === value) ?? "all";
}

export function parsePaymentStatusFilter(value: string | null): PaymentStatusFilter {
  return parseOption<PaymentStatus>(value, ["Unpaid", "Paid"]);
}

export function parsePaymentKindFilter(value: string | null): PaymentKindFilter {
  return parseOption(value, PAYMENT_KIND_ORDER);
}

export function parsePaymentMethodFilter(value: string | null): PaymentMethodFilter {
  return parseOption(value, PAYMENT_METHOD_ORDER);
}

// Trang bắt đầu từ 1; giá trị không phải số nguyên dương coi như trang 1.
export function parsePage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

// Trang vượt quá số trang hiện có thì lùi về trang cuối (luôn ≥ 1).
export function resolvePage(requested: number, total: number, pageSize: number): number {
  return Math.min(requested, Math.max(1, Math.ceil(total / pageSize)));
}

export function countPayments(payments: Payment[], status: PaymentStatusFilter): number {
  return status === "all" ? payments.length : payments.filter((payment) => payment.status === status).length;
}

// Thẻ “Chưa thanh toán” (UI-Screens MW-10 vùng 1): số khoản và tổng tiền, cộng đúng `amount` do server trả.
export function summarizeUnpaid(payments: Payment[]) {
  const unpaid = payments.filter((payment) => payment.status === "Unpaid");
  return { count: unpaid.length, total: unpaid.reduce((sum, payment) => sum + payment.amount, 0) };
}

// Lọc ở web trên trang đang xem: API chưa có tham số kind, method (UI-Screens G-07).
export function filterPageRows(rows: PaymentRow[], kind: PaymentKindFilter, method: PaymentMethodFilter): PaymentRow[] {
  return rows.filter(
    (row) => (kind === "all" || row.kind === kind) && (method === "all" || row.method === method),
  );
}

// “Hiển thị a – b trong n khoản”; không có khoản nào thì 0 – 0.
export function getPageRange(page: number, pageSize: number, total: number) {
  if (total === 0) return { from: 0, to: 0 };
  return { from: (page - 1) * pageSize + 1, to: Math.min(total, page * pageSize) };
}

// Tên người xem: “<tên thú cưng>, <khoản>, <mã>.” (MW-10·D1); chưa có tên thú cưng thì bỏ phần tên.
export function describePayment(row: PaymentRow): string {
  const code = formatAppointmentCode(row.appointmentId);
  const kind = PAYMENT_KIND_LABELS[row.kind];
  return row.petName ? `${row.petName}, ${lowerFirst(kind)}, ${code}.` : `${kind}, ${code}.`;
}

// Dòng phụ dưới mã lịch: “<thú cưng>, <khách>”; không có tên nào thì null.
export function describeParties(row: PaymentRow): string | null {
  const parts = [row.petName, row.customerName].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : null;
}

// Cột “Ghi nhận” của khoản đã thanh toán: phương thức và thời điểm. Khoản chưa thanh toán → null.
export function describeRecord(row: Payment): { method: string; detail: string | null } | null {
  if (row.status !== "Paid" || !row.method) return null;
  const time = row.paidAt ? `${formatTime(row.paidAt)} ${formatShortDate(row.paidAt)}` : null;
  // Thanh toán trực tuyến do cổng xác nhận (webhook), không có người ghi nhận.
  const detail = row.method === "Online" ? [time, "xác nhận qua cổng"].filter(Boolean).join(", ") : time;
  return { method: PAYMENT_METHOD_LABELS[row.method], detail };
}
