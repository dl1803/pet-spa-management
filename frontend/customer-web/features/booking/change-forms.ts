import {
  getApplicableServices,
  keepApplicableServiceIds,
  type HotelBookingFormValues,
  type SpaBookingFormValues,
} from "@/features/booking/forms";
import type { AppointmentDetail, Pet, Service } from "@/lib/api/types";
import { formatTime } from "@/lib/format";
import { getStoreDateKey } from "@/lib/time";

export const CHANGE_REQUEST_SENT_MESSAGE = "Đã gửi yêu cầu đổi lịch, lịch đang chờ cửa hàng duyệt lại.";
export const CHANGE_UNCHANGED_REASON = "Chưa có thay đổi so với lịch hiện tại.";

function hasSameIds(first: string[], second: string[]) {
  const sortedSecond = [...second].sort();
  return first.length === second.length && [...first].sort().every((id, index) => id === sortedSecond[index]);
}

// Khi ngày hiện tại không nằm trong các ngày đặt được thì chọn ngày đầu tiên và để trống khung giờ.
export function getSpaChangeDefaults(
  appointment: AppointmentDetail,
  pets: Pet[],
  services: Service[],
  dates: string[],
): SpaBookingFormValues {
  const { slotStart } = appointment;
  const currentDate = slotStart ? getStoreDateKey(slotStart) : "";
  const isInRange = dates.includes(currentDate);
  const pet = pets.find((item) => item.petId === appointment.petId);
  const rawServiceIds = (appointment.services ?? []).map((service) => service.serviceId);
  const serviceIds = pet ? keepApplicableServiceIds(rawServiceIds, getApplicableServices(services, pet)) : [];

  return {
    petId: appointment.petId,
    serviceIds,
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

export function getHotelChangeDefaults(appointment: AppointmentDetail): HotelBookingFormValues {
  const { plannedCheckIn, plannedCheckOut } = appointment;

  return {
    petId: appointment.petId,
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

