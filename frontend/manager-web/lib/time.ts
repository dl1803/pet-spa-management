export const STORE_TIME_ZONE = "Asia/Ho_Chi_Minh";

const DATE_KEY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getStoreDateKey(value: string | Date) {
  return DATE_KEY_FORMAT.format(new Date(value));
}

export function getPreviousDateKey(dateKey: string) {
  return DATE_KEY_FORMAT.format(new Date(Date.parse(`${dateKey}T00:00:00Z`) - 86_400_000));
}

export function countNights(checkIn: string, checkOut: string) {
  const start = Date.parse(`${getStoreDateKey(checkIn)}T00:00:00Z`);
  const end = Date.parse(`${getStoreDateKey(checkOut)}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

// Múi giờ cửa hàng không có giờ mùa hè nên độ lệch cố định.
export const STORE_UTC_OFFSET = "+07:00";

export function addDaysToDateKey(dateKey: string, days: number) {
  return DATE_KEY_FORMAT.format(new Date(Date.parse(`${dateKey}T00:00:00Z`) + days * 86_400_000));
}

// Dựng giá trị gửi API từ ngày (YYYY-MM-DD) và mốc giờ (HH:mm). Không dùng toISOString vì ra giờ UTC.
export function buildStoreDateTime(dateKey: string, time: string) {
  return `${dateKey}T${time}:00${STORE_UTC_OFFSET}`;
}


