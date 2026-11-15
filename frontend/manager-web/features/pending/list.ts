import type { Appointment, AppointmentType } from "@/lib/api/types";
import { formatShortDate, formatTime } from "@/lib/format";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/labels";

export type PendingTypeFilter = "all" | AppointmentType;

export const PENDING_TYPE_FILTERS: { value: PendingTypeFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "Spa", label: APPOINTMENT_TYPE_LABELS.Spa },
  { value: "Hotel", label: APPOINTMENT_TYPE_LABELS.Hotel },
];

// Tham số `type` trên URL dùng đúng giá trị của API; giá trị lạ hoặc thiếu là “Tất cả”.
export function parsePendingTypeFilter(value: string | null): PendingTypeFilter {
  return value === "Spa" || value === "Hotel" ? value : "all";
}

// Mốc hẹn dùng để sắp xếp: giờ bắt đầu của lịch spa, giờ nhận của lịch lưu trú; thiếu thì lấy giờ tạo lịch.
function getAppointmentMoment(appointment: Appointment): string {
  const moment = appointment.type === "Spa" ? appointment.slotStart : appointment.plannedCheckIn;
  return moment ?? appointment.createdAt;
}

// Sắp theo giờ hẹn gần nhất (UI-Screens MW-04 vùng 2). Backend trả theo giờ tạo lịch nên web sắp lại
// (UI-Screens G-06). Giờ hẹn bằng nhau thì giữ thứ tự backend (lịch tạo sớm hơn trước).
export function sortPendingAppointments(appointments: Appointment[]): Appointment[] {
  return [...appointments].sort((a, b) => Date.parse(getAppointmentMoment(a)) - Date.parse(getAppointmentMoment(b)));
}

export function filterPendingAppointments(appointments: Appointment[], filter: PendingTypeFilter): Appointment[] {
  return filter === "all" ? appointments : appointments.filter((appointment) => appointment.type === filter);
}

export function countPendingAppointments(appointments: Appointment[]) {
  const spa = appointments.filter((appointment) => appointment.type === "Spa").length;
  return { spa, hotel: appointments.length - spa };
}

export function getPendingSubtitle(appointments: Appointment[]): string {
  const { spa, hotel } = countPendingAppointments(appointments);
  return `Spa ${spa}, lưu trú ${hotel}. Xử lý theo thứ tự giờ hẹn gần nhất.`;
}

// Lịch đang chọn: lịch có trong danh sách đang hiển thị, nếu không thì lịch đầu tiên (rỗng thì null).
export function resolveSelectedAppointmentId(visible: Appointment[], requestedId: string | null): string | null {
  if (requestedId !== null && visible.some((appointment) => appointment.appointmentId === requestedId)) return requestedId;
  return visible[0]?.appointmentId ?? null;
}

// Cuống của phiếu (MW-04 vùng 2): spa “14:00 / 06/10”; lưu trú “08/10 / → 10/10”.
export function getListStamp(appointment: Appointment): { primary: string; secondary: string } {
  if (appointment.type === "Spa" && appointment.slotStart) {
    return { primary: formatTime(appointment.slotStart), secondary: formatShortDate(appointment.slotStart) };
  }
  if (appointment.type === "Hotel" && appointment.plannedCheckIn) {
    return {
      primary: formatShortDate(appointment.plannedCheckIn),
      secondary: appointment.plannedCheckOut ? `→ ${formatShortDate(appointment.plannedCheckOut)}` : "",
    };
  }
  return { primary: formatShortDate(appointment.createdAt), secondary: "" };
}
