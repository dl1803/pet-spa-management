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

export function countNights(checkIn: string, checkOut: string) {
  const start = Date.parse(`${getStoreDateKey(checkIn)}T00:00:00Z`);
  const end = Date.parse(`${getStoreDateKey(checkOut)}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

