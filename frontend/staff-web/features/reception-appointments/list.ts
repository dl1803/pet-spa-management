import type { ListAppointmentsParams } from "@/lib/api/endpoints/appointments";
import type {
  Appointment,
  AppointmentDetail,
  AppointmentPage,
  AppointmentStatus,
  Pet,
  Species,
} from "@/lib/api/types";
import { addDaysToDateKey, getStoreDateKey } from "@/lib/time";

// Thông tin một dòng lịch hẹn trong danh sách của lễ tân.
export type ReceptionAppointmentRow = {
  appointment: AppointmentDetail;
  // null khi hồ sơ thú cưng chưa tải được.
  species: Species | null;
  breed: string | null;
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

// pageSize lớn nhất backend nhận (ListAppointmentsQueryValidator: 1 đến 100).
export const RECEPTION_LIST_PAGE_SIZE = 100;
// Làm mới danh sách 60 giây một lần.
export const RECEPTION_LIST_REFETCH_MS = 60_000;

// Gọi riêng từng trạng thái còn xử lý tại quầy vì API chỉ lọc một status mỗi lần, sắp lịch tạo sớm nhất trước và chưa lọc theo ngày:
// gọi không lọc thì lịch Hoàn tất/Đã hủy tích lũy sẽ đẩy lịch mới ra khỏi trang đầu.
export const RECEPTION_LISTED_STATUSES = ["Pending", "Confirmed", "Received", "InProgress", "InStay"] as const satisfies readonly AppointmentStatus[];

export type ReceptionListedStatus = (typeof RECEPTION_LISTED_STATUSES)[number];

export function buildReceptionListParams(status: ReceptionListedStatus): ListAppointmentsParams {
  return { status, page: 1, pageSize: RECEPTION_LIST_PAGE_SIZE };
}

// Các trang tải theo từng trạng thái không cùng thời điểm nên một lịch có thể xuất hiện hai lần: giữ bản ở trang đứng sau.
export function mergeAppointmentPages(pages: readonly AppointmentPage[]): Appointment[] {
  const byId = new Map<string, Appointment>();
  for (const page of pages) {
    for (const appointment of page.items) byId.set(appointment.appointmentId, appointment);
  }
  return [...byId.values()];
}

// Số lịch backend có nhưng chưa nằm trong trang đã tải.
export function countUnloadedAppointments(pages: readonly AppointmentPage[]): number {
  return pages.reduce((sum, page) => sum + Math.max(0, page.total - page.items.length), 0);
}

// Lịch thuộc ngày đang xem: spa theo giờ bắt đầu; lưu trú theo ngày nhận hoặc ngày trả (theo múi giờ cửa hàng).
export function belongsToDate(appointment: Appointment, dateKey: string): boolean {
  if (appointment.type === "Spa") return toDateKey(appointment.slotStart) === dateKey;
  return toDateKey(appointment.plannedCheckIn) === dateKey || toDateKey(appointment.plannedCheckOut) === dateKey;
}

// Ghép lịch với hồ sơ thú cưng (loài, giống) và chi tiết lịch spa (nhân viên). Chưa có dữ liệu thì để null/bỏ trống.
// Backend chưa có API đọc mã chuồng cho lễ tân nên cageCode luôn là null.
export function buildReceptionRows(
  appointments: readonly Appointment[],
  pets: ReadonlyMap<string, Pet>,
  details: ReadonlyMap<string, AppointmentDetail>,
): ReceptionAppointmentRow[] {
  return appointments.map((appointment) => {
    const pet = pets.get(appointment.petId);
    const staff = details.get(appointment.appointmentId)?.staff;
    return {
      appointment: staff === undefined ? appointment : { ...appointment, staff },
      species: pet?.species ?? null,
      breed: pet?.breed ?? null,
      cageCode: null,
    };
  });
}

