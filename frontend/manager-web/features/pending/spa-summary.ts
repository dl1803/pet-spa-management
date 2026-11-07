import type { SpaSuggestions } from "@/lib/api/types";
import { formatAppointmentCode, formatMoney, formatNameList, formatShortDate, formatTime, formatTimeRange } from "@/lib/format";

const MINUTE_MS = 60_000;

// Lý do lịch spa đang chờ xác nhận ngoài trường hợp mới đặt (MW-04 vùng 7). API chưa trả thông tin này (UI-Screens G-08),
// nên hiện chỉ có trong dữ liệu mô phỏng. Số tiền không nằm ở đây: lấy từ `amount` của lịch, web không tự tính.
export type SpaPendingReason =
  | {
      kind: "CustomerChanged";
      // ISO 8601.
      changedAt: string;
      previousSlotStart: string;
      previousServiceNames: string[];
      // Số tiền trước khi khách đổi lịch, do server cung cấp.
      previousAmount: number;
    }
  | {
      kind: "StaffDeactivated";
      deactivatedStaffName: string;
      // ISO 8601.
      deactivatedAt: string;
      // Nhân viên đã bị gỡ khỏi lịch.
      removedStaffNames: string[];
    };

// “13:00 – 14:30, 07/10” (MW-04 vùng 4).
export function formatSlotRange(slotStart: string, slotEnd: string): string {
  return `${formatTimeRange(slotStart, slotEnd)}, ${formatShortDate(slotStart)}`;
}

// “Giữ chỗ đến 14:45 gồm dọn dẹp”: hết khung giờ cộng thời gian dọn dẹp (Booking.BufferMinutes, GET /config).
export function formatHoldUntil(slotEnd: string, bufferMinutes: number): string {
  const holdUntil = new Date(Date.parse(slotEnd) + bufferMinutes * MINUTE_MS).toISOString();
  return `Giữ chỗ đến ${formatTime(holdUntil)} gồm dọn dẹp`;
}

// “06/10 15:00”: mốc hẹn trong nội dung khách đổi lịch.
export function formatSlotMoment(value: string): string {
  return `${formatShortDate(value)} ${formatTime(value)}`;
}

// “20:30 ngày 05/10”: thời điểm xảy ra sự kiện (khách đổi lịch, nhân viên bị vô hiệu hóa).
export function formatEventMoment(value: string): string {
  return `${formatTime(value)} ngày ${formatShortDate(value)}`;
}

type SpaConfirmMessageSource = {
  appointmentId: string;
  // VND, do server tính; chỉ hiển thị.
  amount: number;
  pendingReason: SpaPendingReason | null;
  suggestions: SpaSuggestions;
};

// Câu toast sau khi xác nhận lịch spa, theo UI demo MW-04. Lịch khách đã đổi: backend tính lại số tiền khi xác nhận (BR-26),
// nêu số tiền của lịch; web không tự tính lại. Còn lại: nêu nhân viên được phân công theo thứ tự đã chọn.
export function getSpaConfirmMessage(
  { appointmentId, amount, pendingReason, suggestions }: SpaConfirmMessageSource,
  staffIds: string[],
): string {
  const code = formatAppointmentCode(appointmentId);
  if (pendingReason?.kind === "CustomerChanged") return `Đã xác nhận ${code} với số tiền ${formatMoney(amount)}`;

  const known = [...suggestions.suggested, ...suggestions.alternatives];
  const names = staffIds.flatMap((staffId) => known.find((staff) => staff.staffId === staffId)?.fullName ?? []);
  return names.length > 0 ? `Đã xác nhận ${code}, phân công ${formatNameList(names)}` : `Đã xác nhận ${code}`;
}
