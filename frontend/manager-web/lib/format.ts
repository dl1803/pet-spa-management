import { STORE_TIME_ZONE } from "@/lib/time";

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
