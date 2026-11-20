import { toApiError } from "@/lib/api/errors";
import type { Pet, PricingRow, Service, SpaBookingRequest } from "@/lib/api/types";
import { formatShortDate, formatWeekdayShort } from "@/lib/format";
import { addDaysToDateKey, buildStoreDateTime } from "@/lib/time";

export type SpaFormValues = {
  serviceIds: string[];
  date: string;
  slotTime: string;
};

export const SERVICE_REQUIRED_MESSAGE = "Vui lòng chọn ít nhất một dịch vụ.";
export const SLOT_REQUIRED_MESSAGE = "Vui lòng chọn một khung giờ còn chỗ.";
export const SLOT_FULL_MESSAGE = "Mốc giờ vừa kín, vui lòng chọn mốc khác.";

const BOOKING_DAY_COUNT = 7;

export type ApplicableService = {
  service: Service;
  pricing: PricingRow;
};

export function getApplicableServices(services: Service[], pet: Pet): ApplicableService[] {
  return services.flatMap((service) => {
    const pricing = service.pricing.find((row) => row.species === pet.species && row.sizeGroup === pet.sizeGroup);
    return pricing ? [{ service, pricing }] : [];
  });
}

export function keepApplicableServiceIds(serviceIds: string[], applicable: ApplicableService[]): string[] {
  return serviceIds.filter((id) => applicable.some(({ service }) => service.serviceId === id));
}

export function summarizeSelection(pet: Pet, selected: ApplicableService[]) {
  return {
    totalPrice: selected.reduce((sum, { pricing }) => sum + pricing.price, 0),
    totalMinutes: selected.reduce((sum, { pricing }) => sum + pricing.durationMinutes, 0),
    staffRequired: Math.max(
      pet.temperament === "Difficult" ? 2 : 1,
      ...selected.map(({ pricing }) => pricing.staffRequired),
    ),
  };
}

export function getBookingDates(todayKey: string): string[] {
  return Array.from({ length: BOOKING_DAY_COUNT }, (_, index) => addDaysToDateKey(todayKey, index));
}

export function formatDateChip(dateKey: string) {
  const value = buildStoreDateTime(dateKey, "12:00");
  return { weekday: formatWeekdayShort(value), day: formatShortDate(value) };
}

export function addMinutesToTime(time: string, minutes: number) {
  const total = (Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function formatSlotRange(time: string, durationMinutes: number) {
  return `${time} – ${addMinutesToTime(time, durationMinutes)}`;
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const text = [hours > 0 ? `${hours} giờ` : "", rest > 0 ? `${rest} phút` : ""].filter(Boolean).join(" ");
  return text || "0 phút";
}

export function formatSpaTime(dateKey: string, slotTime: string, durationMinutes: number) {
  const { weekday, day } = formatDateChip(dateKey);
  return `${weekday} ${day}, ${formatSlotRange(slotTime, durationMinutes)}`;
}

export function describeStaffNeed(pet: Pet, staffRequired: number, durationMinutes: number) {
  const subject =
    pet.temperament === "Difficult" && staffRequired === 2
      ? `${pet.name} khó tính nên lịch cần 2 nhân viên`
      : `Lịch này cần ${staffRequired} nhân viên`;
  return `${subject} trong ${formatDuration(durationMinutes)}. Các mốc đã kín là lúc cửa hàng không có đủ ${staffRequired} nhân viên rảnh.`;
}

export function formatStaffNeed(pet: Pet, staffRequired: number) {
  return pet.temperament === "Difficult" && staffRequired === 2 ? "2 (bé khó tính)" : String(staffRequired);
}

export function toSpaBookingRequest(customerId: string, petId: string, values: SpaFormValues): SpaBookingRequest {
  return {
    petId,
    serviceIds: values.serviceIds,
    slotStart: buildStoreDateTime(values.date, values.slotTime),
    customerId,
  };
}

export function isSlotFullError(error: unknown) {
  const { status, code } = toApiError(error);
  return status === 409 && code === "SLOT_FULL";
}
