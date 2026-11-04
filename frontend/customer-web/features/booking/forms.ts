import { toApiError } from "@/lib/api/errors";
import type { Pet, PricingRow, Service, SpaBookingRequest } from "@/lib/api/types";
import { addDaysToDateKey, buildStoreDateTime } from "@/lib/time";

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
  return [hours > 0 ? `${hours} giờ` : "", rest > 0 ? `${rest} phút` : ""].filter(Boolean).join(" ");
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

