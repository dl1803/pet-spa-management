import { formatAppointmentCode, formatMoney, formatShortDate, formatTime, formatWeekday } from "@/lib/format";
import { countNights, getStoreDateKey } from "@/lib/time";

const DAY_MS = 86_400_000;

export type StaySummary = {
  nights: number;
  // Ngày của từng đêm, dạng “08/10”.
  nightDates: string[];
  // Tạm tính chỉ để hiển thị (Frontend-Conventions mục 11): web không gửi số tiền lên API, backend tính.
  total: number;
  formula: string;
};

export function getStaySummary(
  plannedCheckIn: string,
  plannedCheckOut: string,
  pricePerNight: number,
  foodPerNight: number,
): StaySummary {
  const nights = Math.max(countNights(plannedCheckIn, plannedCheckOut), 0);
  const firstNight = Date.parse(`${getStoreDateKey(plannedCheckIn)}T00:00:00Z`);
  return {
    nights,
    nightDates: Array.from({ length: nights }, (_, index) => formatShortDate(new Date(firstNight + index * DAY_MS).toISOString())),
    total: nights * (pricePerNight + foodPerNight),
    formula: `${nights} × (${formatMoney(pricePerNight)} + ${formatMoney(foodPerNight)})`,
  };
}

// “09:00, thứ năm 08/10” (MW-04 vùng 4).
export function formatStayMoment(value: string): string {
  return `${formatTime(value)}, ${formatWeekday(value)} ${formatShortDate(value)}`;
}

// Câu toast sau khi xác nhận lịch lưu trú thật: nêu chuồng được gán. Chưa nêu việc thông báo khách vì thông báo chỉ có khi backend nối
// sự kiện lịch hẹn với Notifications.
export function getStayAssignedMessage(appointmentId: string, cageCode: string | null): string {
  const code = formatAppointmentCode(appointmentId);
  return cageCode ? `Đã xác nhận ${code}, gán chuồng ${cageCode}` : `Đã xác nhận ${code}`;
}

export function getStayRejectedMessage(appointmentId: string): string {
  return `Đã từ chối lịch hẹn ${formatAppointmentCode(appointmentId)}`;
}
