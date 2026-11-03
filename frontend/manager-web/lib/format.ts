import { getPreviousDateKey, getStoreDateKey, STORE_TIME_ZONE } from "@/lib/time";

const MONEY_FORMAT = new Intl.NumberFormat("vi-VN");
const WEIGHT_FORMAT = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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
const WEEKDAY_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  timeZone: STORE_TIME_ZONE,
  weekday: "long",
});

export function formatMoney(amount: number) {
  return `${MONEY_FORMAT.format(amount)}đ`;
}

export function formatWeight(kg: number) {
  return `${WEIGHT_FORMAT.format(kg)} kg`;
}

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

export function formatWeekday(value: string) {
  return WEEKDAY_FORMAT.format(new Date(value)).toLocaleLowerCase("vi-VN");
}

// Thời gian của thông báo (UI-Screens CW-12): hôm nay chỉ có giờ, hôm qua có nhãn, còn lại là ngày/tháng kèm giờ.
export function formatRelativeDay(value: string, todayKey: string) {
  const dayKey = getStoreDateKey(value);
  if (dayKey === todayKey) return formatTime(value);
  if (dayKey === getPreviousDateKey(todayKey)) return `Hôm qua, ${formatTime(value)}`;
  return `${formatShortDate(value)}, ${formatTime(value)}`;
}

export function formatAppointmentCode(appointmentId: string) {
  return `LH-${appointmentId.slice(0, 8).toUpperCase()}`;
}

// Chỉ để hiển thị: “0903412678” → “0903 412 678”; API vẫn nhận dạng liền.
export function formatPhone(value: string) {
  return /^\d{10}$/.test(value) ? `${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7)}` : value;
}

export function formatNameList(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} và ${names[names.length - 1]}`;
}

export function lowerFirst(text: string) {
  return text.charAt(0).toLocaleLowerCase("vi-VN") + text.slice(1);
}
