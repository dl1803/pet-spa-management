import { getApplicableServices, summarizeSelection } from "@/features/booking/forms";
import { MOCK_PETS, MOCK_SERVICES } from "@/features/booking/mock-data";
import { ApiError } from "@/lib/api/errors";
import type { SlotInfo, SlotStatus, SpaBookingCreated, SpaBookingRequest, SpaSlots } from "@/lib/api/types";

// Dữ liệu giả cho bước chọn khung giờ và gửi yêu cầu. Kết quả suy ra từ đầu vào để thử từng trạng thái.
// Chờ nối API thật: GET /spa/slots, POST /appointments/spa.
//
// Mốc giờ theo ngày:
//   Thứ bảy  -> 400 VALIDATION_ERROR (thử lỗi tải mốc giờ)
//   Chủ nhật -> mọi mốc "Full" (thử ngày đã kín)
//   Ngày khác -> mốc muộn hơn mốc bắt đầu muộn nhất của dịch vụ là "NotAccepted";
//                mốc có (ngày trong tháng + giờ) chia hết cho 3 là "Full"; còn lại "Available".
// Gửi yêu cầu theo mốc giờ đã chọn:
//   11:00 mất mạng · 12:00 409 SLOT_FULL · 13:00 403 BOOKING_LOCKED · 15:00 400 · 16:00 429 · 17:00 500
//   Mốc khác -> tạo lịch thành công.

export const SPA_SLOTS_QUERY_KEY = ["spa-slots"] as const;

const MOCK_DELAY_MS = 600;
const SLOT_TIMES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"] as const;
const SUNDAY = 0;
const SATURDAY = 6;
const BUFFER_MINUTES = 15;

// Mốc vừa bị 409 SLOT_FULL, khóa dạng "YYYY-MM-DDTHH:mm", để lần tải lại thấy mốc đã kín.
const justFilledSlots = new Set<string>();
let createdCount = 0;

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function invalidRequest() {
  return new ApiError({
    kind: "http",
    status: 400,
    code: "VALIDATION_ERROR",
    title: "Dữ liệu không hợp lệ",
    detail: "Dữ liệu không hợp lệ, vui lòng kiểm tra lại thông tin.",
  });
}

function getSelection(petId: string, serviceIds: string[]) {
  const pet = MOCK_PETS.find((item) => item.petId === petId);
  if (!pet || serviceIds.length === 0) throw invalidRequest();

  const selected = getApplicableServices(MOCK_SERVICES, pet).filter(({ service }) => serviceIds.includes(service.serviceId));
  if (selected.length !== serviceIds.length) throw invalidRequest();

  const { totalPrice, totalMinutes, staffRequired } = summarizeSelection(pet, selected);
  const staffCount: 1 | 2 = staffRequired >= 2 ? 2 : 1;
  return { selected, totalPrice, durationMinutes: totalMinutes, staffRequired: staffCount };
}

// "Noon" chỉ có trong dữ liệu giả. Web không đọc group.
function getGroup(hour: number) {
  if (hour < 12) return "Morning";
  if (hour < 15) return "Noon";
  return "Evening";
}

type SpaSlotsParams = { date: string; petId: string; serviceIds: string[] };

export async function mockGetSpaSlots({ date, petId, serviceIds }: SpaSlotsParams): Promise<SpaSlots> {
  await wait();

  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (weekday === SATURDAY) {
    throw new ApiError({
      kind: "http",
      status: 400,
      code: "VALIDATION_ERROR",
      title: "Dữ liệu không hợp lệ",
      detail: "Không tải được khung giờ của ngày đã chọn, vui lòng thử lại.",
    });
  }

  const { selected, durationMinutes, staffRequired } = getSelection(petId, serviceIds);
  const latestStart = selected
    .map(({ service }) => service.latestStartTime)
    .reduce((earliest, time) => (time < earliest ? time : earliest));
  const day = Number(date.slice(8, 10));

  const slots = SLOT_TIMES.map((time): SlotInfo => {
    const hour = Number(time.slice(0, 2));
    let status: SlotStatus = "Available";
    if (time > latestStart) {
      status = "NotAccepted";
    } else if (weekday === SUNDAY || (day + hour) % 3 === 0 || justFilledSlots.has(`${date}T${time}`)) {
      status = "Full";
    }
    return { time, group: getGroup(hour), status };
  });

  return { durationMinutes, staffRequired, bufferMinutes: BUFFER_MINUTES, slots };
}

function getBookingFailure(time: string): ApiError | null {
  switch (time) {
    case "11:00":
      return new ApiError({ kind: "network" });
    case "12:00":
      return new ApiError({
        kind: "http",
        status: 409,
        code: "SLOT_FULL",
        title: "Mốc giờ đã kín",
        detail: "Mốc giờ vừa kín, vui lòng chọn mốc khác.",
      });
    case "13:00":
      return new ApiError({
        kind: "http",
        status: 403,
        code: "BOOKING_LOCKED",
        title: "Tài khoản bị khóa tự đặt lịch",
        detail: "Tài khoản tạm thời không thể tự đặt lịch, vui lòng liên hệ cửa hàng qua hotline.",
      });
    case "15:00":
      return new ApiError({
        kind: "http",
        status: 400,
        code: "VALIDATION_ERROR",
        title: "Dữ liệu không hợp lệ",
        detail: "Dịch vụ này không nhận ở mốc giờ đã chọn.",
      });
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

export async function mockCreateSpaAppointment(request: SpaBookingRequest): Promise<SpaBookingCreated> {
  await wait();

  const { totalPrice, durationMinutes, staffRequired } = getSelection(request.petId, request.serviceIds);
  // slotStart luôn có dạng "YYYY-MM-DDTHH:mm:00+07:00" (buildStoreDateTime).
  const failure = getBookingFailure(request.slotStart.slice(11, 16));
  if (failure) {
    if (failure.code === "SLOT_FULL") justFilledSlots.add(request.slotStart.slice(0, 16));
    throw failure;
  }

  createdCount += 1;
  return {
    appointmentId: `a${String(createdCount).padStart(7, "0")}-0000-4000-8000-000000000001`,
    type: "Spa",
    status: "Pending",
    slotStart: request.slotStart,
    slotEnd: new Date(Date.parse(request.slotStart) + durationMinutes * 60_000).toISOString(),
    staffRequired,
    estimatedAmount: totalPrice,
  };
}

