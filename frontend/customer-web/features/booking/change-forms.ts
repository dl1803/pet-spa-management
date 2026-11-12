import {
  getInitialPetId,
  type HotelBookingFormValues,
  type SpaBookingFormValues,
} from "@/features/booking/forms";
import type { AppointmentDetail, Pet } from "@/lib/api/types";
import { formatTime } from "@/lib/format";
import { getStoreDateKey } from "@/lib/time";

export const CHANGE_REQUEST_SENT_MESSAGE = "Đã gửi yêu cầu đổi lịch, lịch đang chờ cửa hàng duyệt lại.";
export const CHANGE_UNCHANGED_REASON = "Chưa có thay đổi so với lịch hiện tại.";

function hasSameIds(first: string[], second: string[]) {
  const sortedSecond = [...second].sort();
  return first.length === second.length && [...first].sort().every((id, index) => id === sortedSecond[index]);
}

// Khi ngày hiện tại không nằm trong các ngày đặt được thì chọn ngày đầu tiên và để trống khung giờ.
export function getSpaChangeDefaults(appointment: AppointmentDetail, pets: Pet[], dates: string[]): SpaBookingFormValues {
  const { slotStart } = appointment;
  const currentDate = slotStart ? getStoreDateKey(slotStart) : "";
  const isInRange = dates.includes(currentDate);

  return {
    petId: getInitialPetId(pets, appointment.petId),
    serviceIds: (appointment.services ?? []).map((service) => service.serviceId),
    date: isInRange ? currentDate : (dates[0] ?? ""),
    slotTime: slotStart && isInRange ? formatTime(slotStart) : "",
  };
}

export function isSpaChangeUnchanged(initial: SpaBookingFormValues, current: SpaBookingFormValues) {
  return (
    initial.petId === current.petId &&
    initial.date === current.date &&
    initial.slotTime === current.slotTime &&
    hasSameIds(initial.serviceIds, current.serviceIds)
  );
}

export function getHotelChangeDefaults(appointment: AppointmentDetail, pets: Pet[]): HotelBookingFormValues {
  const { plannedCheckIn, plannedCheckOut } = appointment;

  return {
    petId: getInitialPetId(pets, appointment.petId),
    checkInDate: plannedCheckIn ? getStoreDateKey(plannedCheckIn) : "",
    checkInTime: plannedCheckIn ? formatTime(plannedCheckIn) : "",
    checkOutDate: plannedCheckOut ? getStoreDateKey(plannedCheckOut) : "",
    checkOutTime: plannedCheckOut ? formatTime(plannedCheckOut) : "",
  };
}

export function isHotelChangeUnchanged(initial: HotelBookingFormValues, current: HotelBookingFormValues) {
  return (
    initial.petId === current.petId &&
    initial.checkInDate === current.checkInDate &&
    initial.checkInTime === current.checkInTime &&
    initial.checkOutDate === current.checkOutDate &&
    initial.checkOutTime === current.checkOutTime
  );
}

