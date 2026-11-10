import type { AppointmentDetail, Payment, PaymentKind, Species } from "@/lib/api/types";
import { formatAppointmentCode, formatDayAndTime, formatMoney, formatShortDate, formatTime } from "@/lib/format";
import { APPOINTMENT_STATUS_LABELS, PAYMENT_KIND_LABELS, SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { countNights, getStoreDateKey } from "@/lib/time";

export const COUNTER_PAYMENTS_QUERY_KEY = ["counter-payments"] as const;

export const NO_PAYMENTS_MESSAGE = "Không có khoản cần thu.";

// Nhãn ngắn trên cuống phiếu (UI-Screens SW-09 vùng 1).
export const PAYMENT_KIND_SHORT_LABELS: Record<PaymentKind, string> = {
  Spa: "Spa",
  Stay: "Lưu trú",
  LateFee: "Phí trễ",
};

export type HotelRate = {
  pricePerNight: number;
  foodPerNight: number;
};

export type PricedService = {
  name: string;
  price: number;
};

// Một khoản cần thu cùng dữ liệu lịch hẹn để hiển thị (G-07: Payment không có tên thú cưng, tên khách).
// hotelRate, services, completedAt chỉ dùng để giải thích cách tính (vùng 3); số tiền thu luôn là payment.amount.
export type CounterPaymentRow = {
  payment: Payment;
  appointment: AppointmentDetail;
  species: Species;
  hotelRate: HotelRate | null;
  services: PricedService[];
  completedAt: string | null;
};

export type CounterPaymentsData = {
  rows: CounterPaymentRow[];
  // Người xác nhận hiển thị ở chân thẻ (GET /me ở bước nối API).
  confirmerName: string;
};

export type BreakdownLine = {
  label: string;
  value: string;
};

const PLACEHOLDER = "—";
const KG_FORMAT = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

function lowerFirst(text: string) {
  return text.charAt(0).toLocaleLowerCase("vi-VN") + text.slice(1);
}

export function getPetName(row: CounterPaymentRow) {
  return row.appointment.petName || PLACEHOLDER;
}

export function getCustomerName(row: CounterPaymentRow) {
  return row.appointment.customerName || PLACEHOLDER;
}

// “Cốm: tiền lưu trú”.
export function getPaymentTitle(row: CounterPaymentRow) {
  return `${getPetName(row)}: ${lowerFirst(PAYMENT_KIND_LABELS[row.payment.kind])}`;
}

// “LH-XXXXXXXX. Tên khách”. Chưa có dữ liệu khách có tài khoản hay vãng lai nên không hiện thẻ này (G-05).
export function getPaymentSubtitle(row: CounterPaymentRow) {
  return `${formatAppointmentCode(row.appointment.appointmentId)}. ${getCustomerName(row)}`;
}

// Nội dung chuyển khoản “LH<mã>”: mã lịch hiển thị bỏ dấu gạch.
export function getTransferContent(appointmentId: string) {
  return formatAppointmentCode(appointmentId).replace("-", "");
}

// Dòng mô tả trên phiếu rút gọn.
export function describePaymentRow(row: CounterPaymentRow, todayKey: string) {
  const code = formatAppointmentCode(row.appointment.appointmentId);
  switch (row.payment.kind) {
    case "Spa":
      return `Lịch spa đã hoàn tất, ${code}`;
    case "LateFee":
      return `Phí trả muộn, ${code}`;
    case "Stay": {
      const checkIn = row.appointment.plannedCheckIn;
      if (!checkIn) return `Tiền lưu trú, ${code}`;
      const when = getStoreDateKey(checkIn) === todayKey ? "hôm nay" : `ngày ${formatShortDate(checkIn)}`;
      return `Tiền lưu trú, nhận ${formatTime(checkIn)} ${when}`;
    }
  }
}

function formatKg(kg: number) {
  return `${KG_FORMAT.format(kg)} kg`;
}

function describeAppliedGroup(row: CounterPaymentRow) {
  const { appointment, species } = row;
  const group = `${SPECIES_LABELS[species]}, nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}`;
  const weight = appointment.actualWeightKg;
  return weight !== null && weight !== undefined ? `${group} (đã đối chiếu ${formatKg(weight)})` : group;
}

function lateMinutes(plannedCheckOut: string, actualCheckOut: string) {
  const diff = Date.parse(actualCheckOut) - Date.parse(plannedCheckOut);
  return Number.isNaN(diff) ? 0 : Math.max(0, Math.round(diff / 60_000));
}

// Vùng “Cách tính” (chỉ để giải thích). Dòng nào thiếu dữ liệu thì bỏ, không tự suy ra số liệu.
export function buildBreakdown(row: CounterPaymentRow): BreakdownLine[] {
  const { appointment, payment } = row;
  const lines: BreakdownLine[] = [];

  if (payment.kind === "Stay") {
    const status = APPOINTMENT_STATUS_LABELS[appointment.status];
    lines.push({ label: "Lịch hẹn", value: appointment.status === "Confirmed" ? `${status}, chờ tiếp nhận` : status });
    lines.push({ label: "Nhóm áp dụng", value: describeAppliedGroup(row) });
    if (row.hotelRate && appointment.plannedCheckIn && appointment.plannedCheckOut) {
      const nights = countNights(appointment.plannedCheckIn, appointment.plannedCheckOut);
      const { pricePerNight, foodPerNight } = row.hotelRate;
      lines.push({
        label: "Cách tính",
        value: `${nights} đêm × (${formatMoney(pricePerNight)} + ${formatMoney(foodPerNight)})`,
      });
    }
  }

  if (payment.kind === "Spa") {
    if (row.completedAt) lines.push({ label: "Hoàn tất lúc", value: formatDayAndTime(row.completedAt) });
    lines.push({ label: "Nhóm áp dụng", value: describeAppliedGroup(row) });
    for (const service of row.services) lines.push({ label: service.name, value: formatMoney(service.price) });
  }

  if (payment.kind === "LateFee") {
    const { plannedCheckOut, actualCheckOut } = appointment;
    if (plannedCheckOut) lines.push({ label: "Trả dự kiến", value: formatDayAndTime(plannedCheckOut) });
    if (actualCheckOut) {
      const minutes = plannedCheckOut ? lateMinutes(plannedCheckOut, actualCheckOut) : 0;
      const late = minutes > 0 ? ` (trễ ${minutes} phút)` : "";
      lines.push({ label: "Trả thực tế", value: `${formatDayAndTime(actualCheckOut)}${late}` });
    }
  }

  return lines;
}

// Khoản đang chọn: khoản người dùng bấm; chưa có thì khoản của ?appointmentId=; không khớp thì khoản đầu tiên.
export function resolveSelectedRow(
  rows: CounterPaymentRow[],
  selectedPaymentId: string | null,
  appointmentId: string | null,
): CounterPaymentRow | null {
  const chosen = rows.find((row) => row.payment.paymentId === selectedPaymentId);
  if (chosen) return chosen;
  const requested = appointmentId ? rows.find((row) => row.appointment.appointmentId === appointmentId) : undefined;
  return requested ?? rows[0] ?? null;
}
