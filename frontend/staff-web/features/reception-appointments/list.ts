import type { AppointmentDetail, Species } from "@/lib/api/types";
import { addDaysToDateKey, getStoreDateKey } from "@/lib/time";

// Thông tin một dòng lịch hẹn trong danh sách của lễ tân.
export type ReceptionAppointmentRow = {
  appointment: AppointmentDetail;
  species: Species;
  breed: string;
  cageCode: string | null;
};

export type AppointmentFilter = "all" | "waiting" | "inStore" | "hotel" | "pending";

export const APPOINTMENT_FILTERS: { value: AppointmentFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "waiting", label: "Chờ tiếp nhận" },
  { value: "inStore", label: "Đang ở cửa hàng" },
  { value: "hotel", label: "Lưu trú nhận, trả" },
  { value: "pending", label: "Chờ xác nhận" },
];

export type HotelEvent = "checkIn" | "checkOut";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ?date= hợp lệ là ngày có thật dạng YYYY-MM-DD; thiếu hoặc sai thì dùng hôm nay.
export function resolveDateKey(value: string | null, todayKey: string): string {
  if (value === null || !DATE_KEY_PATTERN.test(value)) return todayKey;
  if (Number.isNaN(Date.parse(`${value}T00:00:00Z`))) return todayKey;
  return addDaysToDateKey(value, 0) === value ? value : todayKey;
}

function toDateKey(value: string | null | undefined): string | null {
  return value ? getStoreDateKey(value) : null;
}

// Lưu trú: mốc nhận hoặc trả rơi vào ngày đang xem. Lịch đang lưu trú và trả trong ngày thì lấy "trả".
export function getHotelEvent(appointment: AppointmentDetail, dateKey: string): HotelEvent | null {
  if (appointment.type !== "Hotel") return null;
  const checkInToday = toDateKey(appointment.plannedCheckIn) === dateKey;
  const checkOutToday = toDateKey(appointment.plannedCheckOut) === dateKey;
  if (checkOutToday && (appointment.status === "InStay" || !checkInToday)) return "checkOut";
  if (checkInToday) return "checkIn";
  return null;
}

// Mốc giờ hiển thị và sắp xếp: spa là giờ bắt đầu; lưu trú là giờ nhận hoặc giờ trả trong ngày.
export function getRowTime(appointment: AppointmentDetail, dateKey: string): string | null {
  if (appointment.type === "Spa") return appointment.slotStart ?? null;
  const event = getHotelEvent(appointment, dateKey);
  if (event === "checkIn") return appointment.plannedCheckIn ?? null;
  if (event === "checkOut") return appointment.plannedCheckOut ?? null;
  return null;
}

// "Chờ tiếp nhận": lịch Đã xác nhận có giờ hẹn (spa) hoặc giờ nhận (lưu trú) trong ngày.
function isWaitingToReceive(appointment: AppointmentDetail, dateKey: string): boolean {
  if (appointment.status !== "Confirmed") return false;
  if (appointment.type === "Spa") return toDateKey(appointment.slotStart) === dateKey;
  return toDateKey(appointment.plannedCheckIn) === dateKey;
}

export function matchesFilter(appointment: AppointmentDetail, filter: AppointmentFilter, dateKey: string): boolean {
  switch (filter) {
    case "all":
      return true;
    case "waiting":
      return isWaitingToReceive(appointment, dateKey);
    case "inStore":
      return appointment.status === "Received" || appointment.status === "InProgress";
    case "hotel":
      return getHotelEvent(appointment, dateKey) !== null;
    case "pending":
      return appointment.status === "Pending";
  }
}

export function countByFilter(rows: ReceptionAppointmentRow[], dateKey: string): Record<AppointmentFilter, number> {
  const counts: Record<AppointmentFilter, number> = { all: 0, waiting: 0, inStore: 0, hotel: 0, pending: 0 };
  for (const filter of APPOINTMENT_FILTERS) {
    counts[filter.value] = rows.filter((row) => matchesFilter(row.appointment, filter.value, dateKey)).length;
  }
  return counts;
}

// Sắp xếp theo giờ tăng dần; dòng không có giờ xếp cuối; không sửa mảng đầu vào.
export function sortByTime(rows: ReceptionAppointmentRow[], dateKey: string): ReceptionAppointmentRow[] {
  return rows
    .map((row) => {
      const time = getRowTime(row.appointment, dateKey);
      return { row, timestamp: time === null ? Number.POSITIVE_INFINITY : Date.parse(time) };
    })
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((item) => item.row);
}

