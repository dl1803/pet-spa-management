// MW-02 – Ghép dữ liệu API thật thành DashboardSnapshot (UI-Screens.md). Chỉ ca làm (shifts) và bufferMinutes giữ tạm vì BE chưa có endpoint.
import type { Appointment, AppointmentDetail, Cage, Payment, Staff } from "@/lib/api/types";
import { getStoreDateKey } from "@/lib/time";
import type { DashboardSnapshot } from "./overview";

// MW-02 làm mới 60 giây một lần, chỉ khi tab đang hiển thị (Frontend-Architecture 5.1).
export const DASHBOARD_REFRESH_MS = 60_000;
// Lịch spa/lưu trú/khoản chưa thu trong ngày: một trang tối đa 100 dòng, không phân trang (Frontend-Conventions mục 8).
export const DASHBOARD_PAGE_SIZE = 100;
// Booking.BufferMinutes (seed 15, cho phép 15 – 20); hằng ở web vì backend chưa có GET /config.
export const BUFFER_MINUTES = 15;

// Lọc ở web: giữ lịch spa có giờ bắt đầu thuộc ngày dayKey theo múi giờ cửa hàng.
export function keepStoreDay(items: Appointment[], dayKey: string): Appointment[] {
  return items.filter((item) => item.slotStart != null && getStoreDateKey(item.slotStart) === dayKey);
}

// Giữ lịch lưu trú có mốc nhận hoặc trả dự kiến thuộc ngày dayKey theo múi giờ cửa hàng.
export function keepHotelStoreDay(items: Appointment[], dayKey: string): Appointment[] {
  return items.filter(
    (item) =>
      (item.plannedCheckIn != null && getStoreDateKey(item.plannedCheckIn) === dayKey) ||
      (item.plannedCheckOut != null && getStoreDateKey(item.plannedCheckOut) === dayKey),
  );
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
  hotelAppointments: Appointment[];
  cages: Cage[];
  unpaidPayments: Payment[];
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
    hotelAppointments: input.hotelAppointments,
    cages: input.cages,
    unpaidPayments: input.unpaidPayments,
  };
}
