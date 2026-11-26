import { listAppointments } from "@/lib/api/endpoints/appointments";
import type { Appointment } from "@/lib/api/types";

// pageSize lớn nhất backend nhận (ListAppointmentsQueryValidator: 1 đến 100).
const HISTORY_FETCH_PAGE_SIZE = 100;

// Lịch sử công việc (FR-EXE-06): lịch spa đã hoàn tất do chính nhân viên spa đang đăng nhập được phân công (backend lọc theo phạm vi vai trò).
// API sắp theo ngày tạo tăng dần và chưa lọc theo tháng (UI-Screens G-06) nên tải đủ mọi trang rồi sắp xếp, lọc tháng, chia trang ở web.
// Gộp theo appointmentId để lịch mới hoàn tất giữa hai lần tải không làm trùng dòng.
export async function loadCompletedSpaAppointments(): Promise<Appointment[]> {
  const byId = new Map<string, Appointment>();
  for (let page = 1; ; page += 1) {
    const result = await listAppointments({ type: "Spa", status: "Completed", page, pageSize: HISTORY_FETCH_PAGE_SIZE });
    for (const item of result.items) byId.set(item.appointmentId, item);
    if (result.items.length === 0 || page * HISTORY_FETCH_PAGE_SIZE >= result.total) break;
  }
  return [...byId.values()];
}
