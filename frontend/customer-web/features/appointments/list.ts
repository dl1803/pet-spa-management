import type { AppointmentDetail, Appointment, AppointmentStatus, AppointmentType } from "@/lib/api/types";
import { formatTime, formatWeekday, lowerFirst } from "@/lib/format";
import { CANCEL_REASON_LABELS } from "@/lib/labels";
import { countNights } from "@/lib/time";

export type AppointmentTab = "upcoming" | "completed" | "cancelled";

export const APPOINTMENT_TABS: { value: AppointmentTab; label: string }[] = [
  { value: "upcoming", label: "Đang diễn ra và sắp tới" },
  { value: "completed", label: "Đã hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
];

const TAB_STATUSES: Record<AppointmentTab, AppointmentStatus[]> = {
  upcoming: ["Pending", "Confirmed", "Received", "InProgress", "InStay"],
  completed: ["Completed"],
  cancelled: ["Cancelled"],
};

export const APPOINTMENTS_PAGE_SIZE = 20;

export function parseTab(value: string | null): AppointmentTab {
  return APPOINTMENT_TABS.find((tab) => tab.value === value)?.value ?? "upcoming";
}

export function parseType(value: string | null): AppointmentType | null {
  return value === "Spa" || value === "Hotel" ? value : null;
}

export function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function filterAppointments<T extends Appointment>(
  items: T[],
  tab: AppointmentTab,
  type: AppointmentType | null,
): T[] {
  return items.filter((item) => TAB_STATUSES[tab].includes(item.status) && (type === null || item.type === type));
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  return { page: current, items: items.slice((current - 1) * pageSize, current * pageSize) };
}

export function describeAppointment(appointment: AppointmentDetail): string {
  if (appointment.status === "Cancelled") {
    return appointment.cancelReason ? `Lý do hủy: ${lowerFirst(CANCEL_REASON_LABELS[appointment.cancelReason])}.` : "";
  }
  if (appointment.type === "Hotel") {
    const { plannedCheckIn, plannedCheckOut } = appointment;
    if (!plannedCheckIn || !plannedCheckOut) return "";
    const nights = countNights(plannedCheckIn, plannedCheckOut);
    return `${nights} đêm: nhận ${formatTime(plannedCheckIn)} ${formatWeekday(plannedCheckIn)}, trả ${formatTime(plannedCheckOut)} ${formatWeekday(plannedCheckOut)}.`;
  }
  const serviceNames = (appointment.services ?? []).flatMap((service) => (service.name ? [service.name] : []));
  const staffNames = (appointment.staff ?? []).flatMap((member) => (member.fullName ? [member.fullName] : []));
  const parts: string[] = [];
  if (serviceNames.length > 0) parts.push(`${serviceNames.join(", ")}.`);
  if (staffNames.length > 0) parts.push(`Nhân viên ${staffNames.join(", ")}.`);
  return parts.join(" ");
}
