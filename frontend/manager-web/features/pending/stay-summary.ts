import { formatMoney, formatShortDate, formatTime, formatWeekday } from "@/lib/format";
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
