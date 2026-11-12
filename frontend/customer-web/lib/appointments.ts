import { toApiError } from "@/lib/api/errors";
import type { Appointment, AppointmentStatus } from "@/lib/api/types";
import {
  formatDate,
  formatLongDate,
  formatShortDate,
  formatTime,
  formatTimeRange,
  formatWeekday,
} from "@/lib/format";
import { STORE_HOTLINE } from "@/lib/store-info";

export function getAppointmentStart(appointment: Appointment): string | null {
  const start = appointment.type === "Spa" ? appointment.slotStart : appointment.plannedCheckIn;
  return start ?? null;
}

function getStartTimestamp(appointment: Appointment) {
  const start = getAppointmentStart(appointment);
  return start === null ? null : Date.parse(start);
}

export function sortByStart<T extends Appointment>(items: T[], direction: "asc" | "desc"): T[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const timeA = getStartTimestamp(a);
    const timeB = getStartTimestamp(b);
    if (timeA === null || timeB === null) {
      return timeA === timeB ? 0 : timeA === null ? 1 : -1;
    }
    return (timeA - timeB) * sign;
  });
}

export const CHANGE_WINDOW_CLOSED_MESSAGE = `Đã quá thời hạn tự đổi/hủy, vui lòng liên hệ hotline ${STORE_HOTLINE} để được hỗ trợ.`;

// Chỉ lịch Chờ xác nhận hoặc Đã xác nhận mới được tự đổi/hủy; việc còn trong hạn do backend quyết định qua 409 CHANGE_WINDOW_CLOSED.
export function canSelfChangeOrCancel(status: AppointmentStatus): boolean {
  return status === "Pending" || status === "Confirmed";
}

export function isChangeWindowClosedError(error: unknown): boolean {
  const { status, code } = toApiError(error);
  return status === 409 && code === "CHANGE_WINDOW_CLOSED";
}

export function isInvalidTransitionError(error: unknown): boolean {
  const { status, code } = toApiError(error);
  return status === 409 && code === "INVALID_TRANSITION";
}

export function describeSchedule(appointment: Appointment): string {
  if (appointment.type === "Hotel") {
    const { plannedCheckIn, plannedCheckOut } = appointment;
    if (!plannedCheckIn || !plannedCheckOut) return "";
    return `Nhận ${formatTime(plannedCheckIn)} ${formatWeekday(plannedCheckIn)} ${formatShortDate(plannedCheckIn)}, trả ${formatTime(plannedCheckOut)} ${formatWeekday(plannedCheckOut)} ${formatDate(plannedCheckOut)}`;
  }
  const { slotStart, slotEnd } = appointment;
  if (!slotStart || !slotEnd) return "";
  return `${formatLongDate(slotStart)}, ${formatTimeRange(slotStart, slotEnd)}`;
}

