import { ApiError } from "@/lib/api/errors";
import type { HotelAvailability, HotelBookingCreated, HotelBookingRequest } from "@/lib/api/types";
import { MOCK_HOTEL_PRICING, MOCK_PETS } from "@/features/reception-booking/mock-data";
import { findPricingRow } from "@/features/reception-booking/forms";
import { countNights, getStoreDateKey } from "@/lib/time";

export const HOTEL_AVAILABILITY_QUERY_KEY = ["hotel-availability"] as const;

const MOCK_DELAY_MS = 600;
const SATURDAY = 6;
const MAX_AVAILABLE_NIGHTS = 6;

const justFilledStays = new Set<string>();
let createdCount = 0;

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
  if (!pet || nights < 1) throw invalidRequest();

  const row = findPricingRow(MOCK_HOTEL_PRICING, pet);
  if (!row) throw invalidRequest();
  const available = nights <= MAX_AVAILABLE_NIGHTS && !justFilledStays.has(`${from}|${to}`);
  return { pet, nights, available, estimatedAmount: nights * (row.pricePerNight + row.foodPerNight) };
}

type HotelAvailabilityParams = { petId: string; from: string; to: string };

export async function mockGetHotelAvailability({ petId, from, to }: HotelAvailabilityParams): Promise<HotelAvailability> {
  await wait();

  const checkInWeekday = new Date(`${getStoreDateKey(from)}T00:00:00Z`).getUTCDay();
  if (checkInWeekday === SATURDAY) {
    throw invalidRequest("Không kiểm tra được chỗ của ngày đã chọn, vui lòng thử lại.");
  }

  const { nights, available, estimatedAmount } = getQuote(petId, from, to);
  return { available, nights, estimatedAmount };
}

function getCreateFailure(checkOutTime: string): ApiError | null {
  switch (checkOutTime) {
    case "11:00":
      return new ApiError({ kind: "network" });
    case "12:00":
      return noCapacity();
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

  const { pet, nights, available, estimatedAmount } = getQuote(
    request.petId,
    request.plannedCheckIn,
    request.plannedCheckOut,
  );
  if (request.customerId !== pet.customerId) throw invalidRequest();

  const failure = getCreateFailure(request.plannedCheckOut.slice(11, 16));
  if (failure) {
    if (failure.code === "NO_CAPACITY") justFilledStays.add(`${request.plannedCheckIn}|${request.plannedCheckOut}`);
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

