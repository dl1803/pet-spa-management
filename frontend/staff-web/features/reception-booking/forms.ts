import { toApiError } from "@/lib/api/errors";
import type { HotelBookingRequest, HotelPricingRow, Pet } from "@/lib/api/types";
import { formatShortDate } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { addDaysToDateKey, buildStoreDateTime, getStoreDateKey } from "@/lib/time";

export type BookingType = "Spa" | "Hotel";

export type HotelStayFormValues = {
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
};

export type HotelStay = { from: string; to: string };

export const EMPTY_STAY_VALUES: HotelStayFormValues = {
  checkInDate: "",
  checkInTime: "",
  checkOutDate: "",
  checkOutTime: "",
};

export const CHECK_IN_DATE_REQUIRED_MESSAGE = "Vui lòng chọn ngày nhận.";
export const CHECK_IN_TIME_REQUIRED_MESSAGE = "Vui lòng chọn giờ nhận.";
export const CHECK_OUT_DATE_REQUIRED_MESSAGE = "Vui lòng chọn ngày trả.";
export const CHECK_OUT_TIME_REQUIRED_MESSAGE = "Vui lòng chọn giờ trả.";
export const CHECK_OUT_NOT_AFTER_MESSAGE = "Ngày trả phải sau ngày nhận.";
export const NO_CAPACITY_TITLE = "Hết chỗ";
export const NO_CAPACITY_MESSAGE = "Hết chỗ trong thời gian này, vui lòng chọn ngày khác.";
export const NO_CAPACITY_REASON = "Hết chỗ trong thời gian đã chọn.";

export function validateCheckOutDate(checkOutDate: string, checkInDate: string): true | string {
  if (checkOutDate === "") return CHECK_OUT_DATE_REQUIRED_MESSAGE;
  if (checkInDate !== "" && checkOutDate <= checkInDate) return CHECK_OUT_NOT_AFTER_MESSAGE;
  return true;
}

export function isCheckOutNotAfter(values: HotelStayFormValues) {
  return values.checkInDate !== "" && values.checkOutDate !== "" && values.checkOutDate <= values.checkInDate;
}

export function getStay(values: HotelStayFormValues): HotelStay | null {
  const { checkInDate, checkInTime, checkOutDate, checkOutTime } = values;
  if (checkInDate === "" || checkInTime === "" || checkOutDate === "" || checkOutTime === "") return null;
  if (checkOutDate <= checkInDate) return null;
  return {
    from: buildStoreDateTime(checkInDate, checkInTime),
    to: buildStoreDateTime(checkOutDate, checkOutTime),
  };
}

export function getStayKey(stay: HotelStay | null) {
  return stay === null ? null : `${stay.from}|${stay.to}`;
}

export function toHotelBookingRequest(customerId: string, petId: string, stay: HotelStay): HotelBookingRequest {
  return { petId, plannedCheckIn: stay.from, plannedCheckOut: stay.to, customerId };
}

export function parseBookingType(value: string | null): BookingType {
  return value === "Hotel" ? "Hotel" : "Spa";
}

export function getInitialPetId(pets: Pet[], requestedPetId: string | null) {
  if (requestedPetId !== null && pets.some((pet) => pet.petId === requestedPetId)) return requestedPetId;
  return pets[0]?.petId ?? "";
}

export function findPricingRow(rows: HotelPricingRow[], pet: Pet) {
  return rows.find((row) => row.species === pet.species && row.sizeGroup === pet.sizeGroup);
}

export function getInitials(fullName: string) {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(-2)
    .map((word) => word.charAt(0).toLocaleUpperCase("vi-VN"))
    .join("");
}

export function formatNightList(checkIn: string, nights: number) {
  const startKey = getStoreDateKey(checkIn);
  const labels = Array.from({ length: nights }, (_, index) =>
    formatShortDate(buildStoreDateTime(addDaysToDateKey(startKey, index), "12:00")),
  );
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} và ${labels[labels.length - 1]}`;
}

export function describeAvailable(pet: Pet, stay: HotelStay, nights: number) {
  const species = SPECIES_LABELS[pet.species].toLocaleLowerCase("vi-VN");
  return `Còn chuồng phù hợp cho ${species} nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]} trong cả ${nights} đêm ${formatNightList(stay.from, nights)}.`;
}

export function isNoCapacityError(error: unknown) {
  const { status, code } = toApiError(error);
  return status === 409 && code === "NO_CAPACITY";
}

