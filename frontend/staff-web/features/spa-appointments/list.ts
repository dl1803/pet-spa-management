import type { ListAppointmentsParams } from "@/lib/api/endpoints/appointments";
import type { Appointment, AppointmentStatus } from "@/lib/api/types";
import { getStoreDateKey } from "@/lib/time";

// pageSize lớn nhất backend nhận (ListAppointmentsQueryValidator: 1 đến 100).
export const SPA_LIST_PAGE_SIZE = 100;
// SW-02: làm mới danh sách 60 giây một lần (Frontend-Architecture 5.1).
export const SPA_LIST_REFETCH_MS = 60_000;
// Phiếu "Sắp tới" rút gọn: chỉ hiện số lịch gần nhất này để giới hạn số lời gọi chi tiết.
export const UPCOMING_LIMIT = 20;

// Gọi riêng từng trạng thái vì API chỉ lọc một status mỗi lần và sắp theo ngày tạo: gọi không lọc thì lịch Hoàn tất
// tích lũy sẽ đẩy lịch mới ra khỏi trang đầu (UI-Screens G-06).
export type ListedStatus = "Confirmed" | "Received" | "InProgress";

export function buildSpaListParams(status: ListedStatus): ListAppointmentsParams {
  return { type: "Spa", status, page: 1, pageSize: SPA_LIST_PAGE_SIZE };
}

export type SpaAppointmentGroups = {
  today: Appointment[];
  upcoming: Appointment[];
  // Số lịch sắp tới vượt UPCOMING_LIMIT nên chưa hiển thị.
  hiddenUpcoming: number;
};

const LISTED_STATUSES: readonly AppointmentStatus[] = ["Confirmed", "Received", "InProgress"];

function bySlotStart(a: Appointment, b: Appointment) {
  const diff = Date.parse(a.slotStart ?? "") - Date.parse(b.slotStart ?? "");
  return diff !== 0 ? diff : a.appointmentId.localeCompare(b.appointmentId);
}

// Lọc ở web: API chưa có tham số date (UI-Screens G-06). Danh sách đầu vào là các trang đã tải theo từng trạng thái;
// ba lần gọi không cùng thời điểm nên một lịch có thể xuất hiện hai lần: giữ bản ở danh sách đứng sau.
export function groupSpaAppointments(lists: readonly (readonly Appointment[])[], todayKey: string): SpaAppointmentGroups {
  const byId = new Map<string, Appointment>();
  for (const list of lists) {
    for (const appointment of list) byId.set(appointment.appointmentId, appointment);
  }

  const today: Appointment[] = [];
  const upcoming: Appointment[] = [];
  for (const appointment of byId.values()) {
    if (appointment.type !== "Spa" || !appointment.slotStart || !LISTED_STATUSES.includes(appointment.status)) continue;
    const dayKey = getStoreDateKey(appointment.slotStart);
    if (dayKey === todayKey) today.push(appointment);
    else if (dayKey > todayKey && appointment.status === "Confirmed") upcoming.push(appointment);
  }

  today.sort(bySlotStart);
  upcoming.sort(bySlotStart);
  return {
    today,
    upcoming: upcoming.slice(0, UPCOMING_LIMIT),
    hiddenUpcoming: Math.max(0, upcoming.length - UPCOMING_LIMIT),
  };
}

// SW-02: "Mở" cho lịch Đã tiếp nhận / Đang thực hiện, các lịch còn lại "Xem".
export function canOpenExecution(status: AppointmentStatus) {
  return status === "Received" || status === "InProgress";
}
