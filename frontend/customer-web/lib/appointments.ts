import type { Appointment } from "@/lib/api/types";

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

