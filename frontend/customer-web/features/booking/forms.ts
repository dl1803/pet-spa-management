import { toApiError } from "@/lib/api/errors";
import type { HotelBookingRequest, HotelPricingRow, Pet, PricingRow, Service, SpaBookingRequest } from "@/lib/api/types";
import { formatDate, formatNameList, formatShortDate } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { addDaysToDateKey, buildStoreDateTime, getStoreDateKey } from "@/lib/time";

export type SpaBookingFormValues = {
  petId: string;
  serviceIds: string[];
  // Ngày YYYY-MM-DD theo múi giờ cửa hàng.
  date: string;
  // Mốc giờ HH:mm; rỗng khi chưa chọn.
  slotTime: string;
};

export type BookingStep = 1 | 2 | 3;

export const SERVICE_REQUIRED_MESSAGE = "Vui lòng chọn ít nhất một dịch vụ.";
export const SLOT_REQUIRED_MESSAGE = "Vui lòng chọn một khung giờ còn chỗ.";

// Dải ngày của bước 2: 7 ngày kể từ hôm nay.
const BOOKING_DAY_COUNT = 7;

export type ApplicableService = {
  service: Service;
  pricing: PricingRow;
};

// Dịch vụ chỉ áp dụng khi có dòng giá đúng loài và nhóm kích cỡ của thú cưng.
export function getApplicableServices(services: Service[], pet: Pet): ApplicableService[] {
  return services.flatMap((service) => {
    const pricing = service.pricing.find((row) => row.species === pet.species && row.sizeGroup === pet.sizeGroup);
    return pricing ? [{ service, pricing }] : [];
  });
}

// Chọn sẵn thú cưng theo id yêu cầu; không có hoặc không hợp lệ thì chọn thú cưng đầu tiên.
export function getInitialPetId(pets: Pet[], requestedPetId: string | null): string {
  return pets.find((pet) => pet.petId === requestedPetId)?.petId ?? pets[0]?.petId ?? "";
}

// Đổi thú cưng thì bỏ chọn các dịch vụ không còn áp dụng cho thú cưng mới.
export function keepApplicableServiceIds(serviceIds: string[], applicable: ApplicableService[]): string[] {
  return serviceIds.filter((id) => applicable.some(({ service }) => service.serviceId === id));
}

// Tính toán các thông số tóm tắt tạm tính để hiển thị trên giao diện.
export function summarizeSelection(pet: Pet, selected: ApplicableService[]) {
  return {
    totalPrice: selected.reduce((sum, { pricing }) => sum + pricing.price, 0),
    totalMinutes: selected.reduce((sum, { pricing }) => sum + pricing.durationMinutes, 0),
    // Lấy giá trị lớn nhất của staffRequired, tối thiểu 2 nếu thú cưng có tính cách khó tính.
    staffRequired: Math.max(
      pet.temperament === "Difficult" ? 2 : 1,
      ...selected.map(({ pricing }) => pricing.staffRequired),
    ),
  };
}

// Tham số ?step: giá trị lạ hoặc thiếu thì là bước 1.
export function parseBookingStep(value: string | null): BookingStep {
  if (value === "2") return 2;
  if (value === "3") return 3;
  return 1;
}

export function getBookingDates(todayKey: string): string[] {
  return Array.from({ length: BOOKING_DAY_COUNT }, (_, index) => addDaysToDateKey(todayKey, index));
}

// Giờ kết thúc = mốc bắt đầu + thời lượng (không gồm thời gian dọn dẹp).
export function addMinutesToTime(time: string, minutes: number) {
  const total = (Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// "14:00 – 16:00"
export function formatSlotRange(time: string, durationMinutes: number) {
  return `${time} – ${addMinutesToTime(time, durationMinutes)}`;
}

// 120 -> "2 giờ", 90 -> "1 giờ 30 phút", 45 -> "45 phút"
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const text = [hours > 0 ? `${hours} giờ` : "", rest > 0 ? `${rest} phút` : ""].filter(Boolean).join(" ");
  return text || "0 phút";
}

// Dịch vụ có mốc bắt đầu muộn nhất sớm nhất; bằng nhau thì lấy dịch vụ đứng trước.
export function getLatestStart(selected: ApplicableService[]) {
  return selected.reduce<{ name: string; time: string } | null>(
    (earliest, { service }) =>
      earliest === null || service.latestStartTime < earliest.time
        ? { name: service.name, time: service.latestStartTime }
        : earliest,
    null,
  );
}

// Request chỉ gồm petId, serviceIds, slotStart; không gửi nhân viên, giá, trạng thái.
export function toSpaBookingRequest(values: SpaBookingFormValues): SpaBookingRequest {
  return {
    petId: values.petId,
    serviceIds: values.serviceIds,
    slotStart: buildStoreDateTime(values.date, values.slotTime),
  };
}

export function isSlotFullError(error: unknown) {
  const { status, code } = toApiError(error);
  return status === 409 && code === "SLOT_FULL";
}

export function isBookingLockedError(error: unknown) {
  const { status, code } = toApiError(error);
  return status === 403 && code === "BOOKING_LOCKED";
}

// ── Đặt lịch lưu trú ──

export type HotelBookingFormValues = {
  petId: string;
  // Ngày YYYY-MM-DD theo múi giờ cửa hàng; rỗng khi chưa nhập.
  checkInDate: string;
  // Giờ HH:mm; rỗng khi chưa nhập.
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
};

export type HotelStay = { from: string; to: string };

export const EMPTY_HOTEL_STAY_VALUES: Omit<HotelBookingFormValues, "petId"> = {
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
export const CHECK_IN_PAST_MESSAGE = "Ngày nhận không thể ở quá khứ.";
export const NO_CAPACITY_TITLE = "Hết chỗ";
export const NO_CAPACITY_MESSAGE = "Hết chỗ trong thời gian này, vui lòng chọn ngày khác.";
export const NO_CAPACITY_REASON = "Hết chỗ trong thời gian đã chọn.";
export const BOOKING_LOCKED_REASON = "Tài khoản tạm thời không thể tự đặt lịch.";

export function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time);
}

export function isCheckInPast(checkInDate: string, todayKey: string) {
  if (checkInDate === "" || !isValidDateKey(checkInDate)) return false;
  return checkInDate < todayKey;
}

export function validateCheckInDate(checkInDate: string, todayKey: string): true | string {
  return !isCheckInPast(checkInDate, todayKey) || CHECK_IN_PAST_MESSAGE;
}

// Ngày trả phải sau ngày nhận; chỉ so sánh khi cả hai ngày đã nhập và hợp lệ.
export function isCheckOutNotAfter(values: Pick<HotelBookingFormValues, "checkInDate" | "checkOutDate">) {
  if (values.checkInDate === "" || values.checkOutDate === "") return false;
  if (!isValidDateKey(values.checkInDate) || !isValidDateKey(values.checkOutDate)) return true;
  return Date.parse(values.checkOutDate) <= Date.parse(values.checkInDate);
}

export function validateCheckOutDate(
  checkOutDate: string,
  values: Pick<HotelBookingFormValues, "checkInDate">,
): true | string {
  return !isCheckOutNotAfter({ checkInDate: values.checkInDate, checkOutDate }) || CHECK_OUT_NOT_AFTER_MESSAGE;
}

// Khoảng lưu trú hợp lệ để hỏi chỗ trống; null khi thiếu ô hoặc ngày trả không sau ngày nhận.
export function getStay(values: Omit<HotelBookingFormValues, "petId">, todayKey?: string): HotelStay | null {
  const { checkInDate, checkInTime, checkOutDate, checkOutTime } = values;
  if (checkInDate === "" || checkInTime === "" || checkOutDate === "" || checkOutTime === "") return null;
  if (!isValidDateKey(checkInDate) || !isValidDateKey(checkOutDate)) return null;
  if (todayKey !== undefined && isCheckInPast(checkInDate, todayKey)) return null;
  if (isCheckOutNotAfter(values)) return null;
  return {
    from: buildStoreDateTime(checkInDate, checkInTime),
    to: buildStoreDateTime(checkOutDate, checkOutTime),
  };
}

export function getStayKey(stay: HotelStay | null) {
  return stay === null ? null : `${stay.from}|${stay.to}`;
}

// Request chỉ gồm petId, plannedCheckIn, plannedCheckOut; không gửi giá, số đêm, trạng thái.
export function toHotelBookingRequest(petId: string, stay: HotelStay): HotelBookingRequest {
  return { petId, plannedCheckIn: stay.from, plannedCheckOut: stay.to };
}

export function findHotelPricingRow(rows: HotelPricingRow[], pet: Pet): HotelPricingRow | null {
  return rows.find((row) => row.species === pet.species && row.sizeGroup === pet.sizeGroup) ?? null;
}

// Liệt kê ngày của các đêm; rút gọn khi nhiều hơn 7 đêm.
export function formatNightList(checkIn: string, nights: number) {
  if (nights <= 0) return "";
  const startKey = getStoreDateKey(checkIn);
  if (nights > 7) {
    const endKey = addDaysToDateKey(startKey, nights - 1);
    const fromLabel = formatShortDate(buildStoreDateTime(startKey, "12:00"));
    const toLabel =
      startKey.slice(0, 4) !== endKey.slice(0, 4)
        ? formatDate(buildStoreDateTime(endKey, "12:00"))
        : formatShortDate(buildStoreDateTime(endKey, "12:00"));
    return `từ ${fromLabel} đến ${toLabel}`;
  }
  const labels = Array.from({ length: nights }, (_, index) =>
    formatShortDate(buildStoreDateTime(addDaysToDateKey(startKey, index), "12:00")),
  );
  return formatNameList(labels);
}

// Số đêm lấy từ server (HotelAvailability.nights), web không tự tính.
export function describeAvailable(pet: Pet, stay: HotelStay, nights: number) {
  const speciesLabel = SPECIES_LABELS[pet.species].toLocaleLowerCase("vi-VN");
  const sizeLabel = SIZE_GROUP_LABELS[pet.sizeGroup];
  if (nights <= 0) {
    return `Còn chuồng phù hợp cho ${speciesLabel} nhóm ${sizeLabel}.`;
  }
  const nightText = nights > 7 ? `trong ${nights} đêm (${formatNightList(stay.from, nights)})` : `trong cả ${nights} đêm ${formatNightList(stay.from, nights)}`;
  return `Còn chuồng phù hợp cho ${speciesLabel} nhóm ${sizeLabel} ${nightText}.`;
}

export function isNoCapacityError(error: unknown) {
  const { status, code } = toApiError(error);
  return status === 409 && code === "NO_CAPACITY";
}

export function isValidationError(error: unknown) {
  return toApiError(error).status === 400;
}

