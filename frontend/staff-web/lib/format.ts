import { getPreviousDateKey, getStoreDateKey, STORE_TIME_ZONE } from "@/lib/time";

const DATE_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  timeZone: STORE_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const TIME_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  timeZone: STORE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatDate(value: string) {
  return DATE_FORMAT.format(new Date(value));
}

export function formatShortDate(value: string) {
  return formatDate(value).slice(0, 5);
}

export function formatTime(value: string) {
  return TIME_FORMAT.format(new Date(value));
}

export function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

// Thời gian của thông báo (UI-Screens CW-12, SW-13): hôm nay chỉ có giờ, hôm qua có nhãn, còn lại là ngày/tháng kèm giờ.
export function formatRelativeDay(value: string, todayKey: string) {
  const dayKey = getStoreDateKey(value);
  if (dayKey === todayKey) return formatTime(value);
  if (dayKey === getPreviousDateKey(todayKey)) return `Hôm qua, ${formatTime(value)}`;
  return `${formatShortDate(value)}, ${formatTime(value)}`;
}

export function formatAppointmentCode(appointmentId: string) {
  return `LH-${appointmentId.slice(0, 8).toUpperCase()}`;
}
