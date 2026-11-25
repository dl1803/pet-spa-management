// MW-02 – Ghép dữ liệu API thật thành DashboardSnapshot (UI-Screens.md). Khối chưa có API giữ dữ liệu mô phỏng.
import type { Appointment, AppointmentDetail, Staff } from "@/lib/api/types";
import { getStoreDateKey } from "@/lib/time";
import { MOCK_DASHBOARD } from "./mock-data";
import type { DashboardSnapshot } from "./overview";

// MW-02 làm mới 60 giây một lần, chỉ khi tab đang hiển thị (Frontend-Architecture 5.1).
export const DASHBOARD_REFRESH_MS = 60_000;
// Lịch spa trong ngày: một trang tối đa 100 lịch, không phân trang (Frontend-Conventions mục 8).
export const DASHBOARD_PAGE_SIZE = 100;
// Booking.BufferMinutes (seed 15, cho phép 15 – 20); hằng ở web vì backend chưa có GET /config.
export const BUFFER_MINUTES = 15;

// Lọc ở web: API chưa chắc lọc theo `date` (UI-Screens G-06). Giữ lịch có giờ bắt đầu thuộc ngày dayKey theo múi giờ cửa hàng.
export function keepStoreDay(items: Appointment[], dayKey: string): Appointment[] {
  return items.filter((item) => item.slotStart != null && getStoreDateKey(item.slotStart) === dayKey);
}

// Nhân viên phân công và yêu cầu xác nhận chi phí chỉ có ở chi tiết lịch (UI-Screens G-05); lịch Chờ xác nhận chưa có nhân viên,
// lịch đã xong hoặc đã hủy không được vẽ.
export function needsDetail(appointment: Appointment): boolean {
  return appointment.status === "Confirmed" || appointment.status === "Received" || appointment.status === "InProgress";
}

export type LiveSnapshotInput = {
  now: string;
  staff: Staff[];
  pendingCounts: { spa: number; hotel: number };
  spaItems: Appointment[];
  details: AppointmentDetail[];
};

export function buildLiveSnapshot(input: LiveSnapshotInput): DashboardSnapshot {
  const detailById = new Map(input.details.map((detail) => [detail.appointmentId, detail]));
  return {
    now: input.now,
    bufferMinutes: BUFFER_MINUTES,
    staff: input.staff,
    // Chưa có GET /work-shifts nên chưa vẽ ca làm.
    shifts: [],
    pendingCounts: input.pendingCounts,
    spaToday: input.spaItems.map((item) => detailById.get(item.appointmentId) ?? item),
    // Chưa nối API: lịch lưu trú, chuồng, khoản chưa thanh toán vẫn là dữ liệu mô phỏng.
    hotelAppointments: MOCK_DASHBOARD.hotelAppointments,
    cages: MOCK_DASHBOARD.cages,
    unpaidPayments: MOCK_DASHBOARD.unpaidPayments,
  };
}
