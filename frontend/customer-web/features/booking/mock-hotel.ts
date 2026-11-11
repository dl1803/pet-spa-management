import { findHotelPricingRow } from "@/features/booking/forms";
import { MOCK_HOTEL_PRICING, MOCK_PETS } from "@/features/booking/mock-data";
import { ApiError } from "@/lib/api/errors";
import type { HotelAvailability, HotelBookingCreated, HotelBookingRequest, HotelPricing } from "@/lib/api/types";
import { countNights, getStoreDateKey } from "@/lib/time";

// Dữ liệu giả cho màn đặt lịch lưu trú. Kết quả suy ra từ đầu vào để thử từng trạng thái.
// Chờ nối API thật: GET /hotel/pricing, GET /hotel/availability, POST /appointments/hotel.
// Số đêm và số tiền do hàm giả tính, đóng vai server; web chỉ hiển thị.
//
// Kiểm tra còn chỗ theo khoảng đã chọn:
//   Ngày nhận là thứ bảy -> 400 VALIDATION_ERROR (thử lỗi kiểm tra chỗ)
//   Quá 6 đêm            -> available = false (thử hết chỗ)
//   Khoảng khác          -> available = true
// Gửi yêu cầu theo giờ trả đã chọn:
//   11:00 mất mạng · 12:00 409 NO_CAPACITY · 13:00 403 BOOKING_LOCKED · 15:00 400 · 16:00 429 · 17:00 500
//   Giờ khác -> tạo lịch thành công.

export const HOTEL_AVAILABILITY_QUERY_KEY = ["hotel-availability"] as const;
export const HOTEL_PRICING_QUERY_KEY = ["hotel-pricing"] as const;

const MOCK_DELAY_MS = 600;
const SATURDAY = 6;
const MAX_AVAILABLE_NIGHTS = 6;

// Khoảng vừa bị 409 NO_CAPACITY theo loài và nhóm kích cỡ, để lần kiểm tra lại thấy đã kín.
const justFilledStays = new Set<string>();
let createdCount = 0;

function getCapacityKey(petId: string, from: string, to: string) {
  const pet = MOCK_PETS.find((item) => item.petId === petId);
  return pet ? `${pet.species}|${pet.sizeGroup}|${from}|${to}` : `${from}|${to}`;
}

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function invalidRequest(detail = "Dữ liệu không hợp lệ, vui lòng kiểm tra lại thông tin.") {
  return new ApiError({ kind: "http", status: 400, code: "VALIDATION_ERROR", title: "Dữ liệu không hợp lệ", detail });
}

function noCapacity() {
  return new ApiError({
    kind: "http",
    status: 409,
    code: "NO_CAPACITY",
    title: "Hết chỗ",
    detail: "Hết chỗ trong thời gian này, vui lòng chọn ngày khác.",
  });
}

function getQuote(petId: string, from: string, to: string) {
  const pet = MOCK_PETS.find((item) => item.petId === petId);
  const nights = countNights(from, to);
  if (!pet || !(nights >= 1)) throw invalidRequest();

  const row = findHotelPricingRow(MOCK_HOTEL_PRICING.pricing, pet);
  if (!row) throw invalidRequest();

  const available = nights <= MAX_AVAILABLE_NIGHTS && !justFilledStays.has(getCapacityKey(petId, from, to));
  return { nights, available, estimatedAmount: nights * (row.pricePerNight + row.foodPerNight) };
}

export async function mockGetHotelPricing(): Promise<HotelPricing> {
  await wait();
  return MOCK_HOTEL_PRICING;
}

type HotelAvailabilityParams = { petId: string; from: string; to: string };

export async function mockGetHotelAvailability({ petId, from, to }: HotelAvailabilityParams): Promise<HotelAvailability> {
  await wait();

  const checkInWeekday = new Date(`${getStoreDateKey(from)}T00:00:00Z`).getUTCDay();
  if (checkInWeekday === SATURDAY) {
    throw invalidRequest("Không kiểm tra được chỗ của ngày đã chọn, vui lòng thử lại.");
  }

  return getQuote(petId, from, to);
}

function getCreateFailure(checkOutTime: string): ApiError | null {
  switch (checkOutTime) {
    case "11:00":
      return new ApiError({ kind: "network" });
    case "12:00":
      return noCapacity();
    case "13:00":
      return new ApiError({
        kind: "http",
        status: 403,
        code: "BOOKING_LOCKED",
        title: "Tài khoản bị khóa tự đặt lịch",
        detail: "Tài khoản tạm thời không thể tự đặt lịch, vui lòng liên hệ cửa hàng qua hotline.",
      });
    case "15:00":
      return invalidRequest("Thời gian lưu trú không hợp lệ, vui lòng kiểm tra lại.");
    case "16:00":
      return new ApiError({
        kind: "http",
        status: 429,
        code: "RATE_LIMITED",
        title: "Vượt giới hạn tần suất",
        detail: "Bạn đã thử quá nhiều lần.",
      });
    case "17:00":
      return new ApiError({ kind: "http", status: 500 });
    default:
      return null;
  }
}

export async function mockCreateHotelAppointment(request: HotelBookingRequest): Promise<HotelBookingCreated> {
  await wait();

  const { nights, available, estimatedAmount } = getQuote(request.petId, request.plannedCheckIn, request.plannedCheckOut);
  // plannedCheckOut luôn có dạng "YYYY-MM-DDTHH:mm:00+07:00" (buildStoreDateTime).
  const failure = getCreateFailure(request.plannedCheckOut.slice(11, 16));
  if (failure) {
    if (failure.code === "NO_CAPACITY") justFilledStays.add(getCapacityKey(request.petId, request.plannedCheckIn, request.plannedCheckOut));
    throw failure;
  }
  if (!available) throw noCapacity();

  createdCount += 1;
  return {
    appointmentId: `d${String(createdCount).padStart(7, "0")}-0000-4000-8000-000000000001`,
    status: "Pending",
    nights,
    estimatedAmount,
  };
}

