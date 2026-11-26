import type { AppointmentDetail, UpdateAppointmentRequest } from "@/lib/api/types";
import { formatTime } from "@/lib/format";
import { SLOT_TIMES } from "@/lib/slot-times";
import { buildStoreDateTime, getStoreDateKey } from "@/lib/time";

export const RESCHEDULE_MESSAGES = {
  dateRequired: "Vui lòng chọn ngày.",
  slotTimeInvalid: "Vui lòng chọn mốc giờ hợp lệ.",
  timeRequired: "Vui lòng chọn giờ.",
  inPast: "Không thể đặt lịch ở thời điểm trong quá khứ.",
  checkOutAfterCheckIn: "Ngày trả phải sau ngày nhận.",
  staffCount: (n: number) => `Lịch này cần đúng ${n} nhân viên.`,
} as const;

export function canRescheduleAppointment(appointment: AppointmentDetail): boolean {
  if (appointment.status !== "Pending" && appointment.status !== "Confirmed") {
    return false;
  }
  if (appointment.type === "Spa") {
    return Boolean(appointment.slotStart) && (appointment.services?.length ?? 0) >= 1;
  }
  return Boolean(appointment.plannedCheckIn) && Boolean(appointment.plannedCheckOut);
}

export type SpaRescheduleValues = {
  date: string;
  time: string;
  staffIds: string[];
};

export function createSpaRescheduleValues(appointment: AppointmentDetail): SpaRescheduleValues {
  return {
    date: appointment.slotStart ? getStoreDateKey(appointment.slotStart) : "",
    time: appointment.slotStart ? formatTime(appointment.slotStart) : "",
    staffIds: (appointment.staff ?? []).filter((s) => s.isHolding).map((s) => s.staffId),
  };
}

export function validateSpaDate(value: string): string | null {
  if (!value || value.trim() === "") return RESCHEDULE_MESSAGES.dateRequired;
  return null;
}

export function validateSpaTime(value: string): string | null {
  if (!value || value.trim() === "") return RESCHEDULE_MESSAGES.timeRequired;
  if (!SLOT_TIMES.includes(value)) return RESCHEDULE_MESSAGES.slotTimeInvalid;
  return null;
}

export function validateSpaSlotInFuture(date: string, time: string): string | null {
  if (date && time && SLOT_TIMES.includes(time)) {
    const dateTime = buildStoreDateTime(date, time);
    if (Date.parse(dateTime) <= Date.now()) {
      return RESCHEDULE_MESSAGES.inPast;
    }
  }
  return null;
}

export function toggleStaffId(selected: string[], staffId: string, staffRequired: 1 | 2): string[] {
  if (staffRequired === 1) {
    return [staffId];
  }
  return selected.includes(staffId) ? selected.filter((id) => id !== staffId) : [...selected, staffId];
}

export function isStaffSelectionComplete(selected: string[], staffRequired: 1 | 2): boolean {
  return selected.length === staffRequired;
}

// petId, slotStart, serviceIds luôn gửi (backend bắt buộc). staffIds chỉ khi lịch Đã xác nhận và người chọn khác người đang giữ chỗ;
// không gửi thì backend giữ nhân viên hiện tại. confirmOutOfShift chỉ gửi khi quản lý đã đồng ý nhân viên ngoài ca.
export function buildSpaUpdateRequest(
  appointment: AppointmentDetail,
  values: SpaRescheduleValues,
  confirmOutOfShift?: boolean,
): UpdateAppointmentRequest {
  const currentStaff = (appointment.staff ?? []).filter((s) => s.isHolding).map((s) => s.staffId);
  const isStaffChanged =
    values.staffIds.length !== currentStaff.length || values.staffIds.some((id) => !currentStaff.includes(id));
  const shouldSendStaffIds = appointment.status === "Confirmed" && isStaffChanged;

  const request: UpdateAppointmentRequest = {
    petId: appointment.petId,
    slotStart: buildStoreDateTime(values.date, values.time),
    serviceIds: (appointment.services ?? []).map((s) => s.serviceId),
  };

  if (shouldSendStaffIds) {
    request.staffIds = values.staffIds;
  }
  if (confirmOutOfShift) {
    request.confirmOutOfShift = true;
  }

  return request;
}

export type HotelRescheduleValues = {
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  cageId: string;
};

export function createHotelRescheduleValues(appointment: AppointmentDetail): HotelRescheduleValues {
  return {
    checkInDate: appointment.plannedCheckIn ? getStoreDateKey(appointment.plannedCheckIn) : "",
    checkInTime: appointment.plannedCheckIn ? formatTime(appointment.plannedCheckIn) : "",
    checkOutDate: appointment.plannedCheckOut ? getStoreDateKey(appointment.plannedCheckOut) : "",
    checkOutTime: appointment.plannedCheckOut ? formatTime(appointment.plannedCheckOut) : "",
    cageId: appointment.cageId ?? "",
  };
}

export function validateHotelCheckInDate(value: string): string | null {
  if (!value || value.trim() === "") return RESCHEDULE_MESSAGES.dateRequired;
  return null;
}

export function validateHotelCheckInTime(value: string): string | null {
  if (!value || value.trim() === "") return RESCHEDULE_MESSAGES.timeRequired;
  return null;
}

export function validateHotelCheckOutDate(value: string): string | null {
  if (!value || value.trim() === "") return RESCHEDULE_MESSAGES.dateRequired;
  return null;
}

export function validateHotelCheckOutTime(value: string): string | null {
  if (!value || value.trim() === "") return RESCHEDULE_MESSAGES.timeRequired;
  return null;
}

export function validateHotelCheckInInFuture(checkInDate: string, checkInTime: string): string | null {
  if (checkInDate && checkInTime) {
    const dateTime = buildStoreDateTime(checkInDate, checkInTime);
    if (Date.parse(dateTime) <= Date.now()) {
      return RESCHEDULE_MESSAGES.inPast;
    }
  }
  return null;
}

export function validateHotelCheckOutAfterCheckIn(checkInDate: string, checkOutDate: string): string | null {
  if (checkInDate && checkOutDate) {
    if (checkOutDate <= checkInDate) {
      return RESCHEDULE_MESSAGES.checkOutAfterCheckIn;
    }
  }
  return null;
}

// cageId chỉ gửi khi lịch lưu trú đã xác nhận và quản lý chọn chuồng khác chuồng hiện tại;
// không gửi thì backend giữ chuồng hiện tại (gửi cho lịch Pending sẽ bị 400 VALIDATION_ERROR).
export function buildHotelUpdateRequest(
  appointment: AppointmentDetail,
  values: HotelRescheduleValues,
): UpdateAppointmentRequest {
  const request: UpdateAppointmentRequest = {
    petId: appointment.petId,
    plannedCheckIn: buildStoreDateTime(values.checkInDate, values.checkInTime),
    plannedCheckOut: buildStoreDateTime(values.checkOutDate, values.checkOutTime),
  };

  const currentCageId = appointment.cageId ?? "";
  if (appointment.status === "Confirmed" && values.cageId && values.cageId !== currentCageId) {
    request.cageId = values.cageId;
  }

  return request;
}
