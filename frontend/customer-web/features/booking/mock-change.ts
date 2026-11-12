import { addMinutesToTime, getApplicableServices, summarizeSelection } from "@/features/booking/forms";
import { MOCK_PETS, MOCK_SERVICES } from "@/features/booking/mock-data";
import { ApiError } from "@/lib/api/errors";
import type { AppointmentDetail, StatusResult, UpdateAppointmentRequest } from "@/lib/api/types";
import { getMockAppointmentForChange, replaceMockAppointment } from "@/lib/mock-appointments";
import { buildStoreDateTime, countNights } from "@/lib/time";

// Dữ liệu giả cho màn đổi lịch hẹn, đóng vai server. Chờ nối API thật: PUT /appointments/{appointmentId}.
// Điều kiện chung (quyền, mốc tự đổi/hủy, trạng thái) do getMockAppointmentForChange kiểm tra, xem lib/mock-appointments.ts.
// Kết quả thành công: lịch về Chờ xác nhận, bỏ phân công nhân viên, cập nhật nội dung mới.
//
// Gửi yêu cầu đổi lịch spa theo mốc giờ đã chọn, đổi lịch lưu trú theo giờ trả đã chọn:
//   11:00 mất mạng · 12:00 409 SLOT_FULL (spa) hoặc 409 NO_CAPACITY (lưu trú) · 13:00 409 INVALID_TRANSITION
//   15:00 400 · 16:00 429 · 17:00 500
//   Mốc khác -> thành công.

const MOCK_DELAY_MS = 600;
// Như mock đặt lịch lưu trú: quá 6 đêm là hết chỗ.
const MAX_AVAILABLE_NIGHTS = 6;

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

function slotFull() {
  return new ApiError({
    kind: "http",
    status: 409,
    code: "SLOT_FULL",
    title: "Mốc giờ đã kín",
    detail: "Mốc giờ vừa kín, vui lòng chọn mốc khác.",
  });
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

function getChangeFailure(time: string, capacityFailure: () => ApiError) {
  switch (time) {
    case "11:00":
      return new ApiError({ kind: "network" });
    case "12:00":
      return capacityFailure();
    case "13:00":
      return new ApiError({
        kind: "http",
        status: 409,
        code: "INVALID_TRANSITION",
        title: "Trạng thái không hợp lệ",
        detail: "Lịch hẹn đã thay đổi trạng thái, vui lòng tải lại trang.",
      });
    case "15:00":
      return invalidRequest();
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

function applySpaChange(current: AppointmentDetail, request: UpdateAppointmentRequest): AppointmentDetail {
  const { petId, serviceIds, slotStart } = request;
  if (!petId || !serviceIds || serviceIds.length === 0 || !slotStart) throw invalidRequest();

  const pet = MOCK_PETS.find((item) => item.petId === petId);
  if (!pet) throw invalidRequest();
  const selected = getApplicableServices(MOCK_SERVICES, pet).filter(({ service }) => serviceIds.includes(service.serviceId));
  if (selected.length !== serviceIds.length) throw invalidRequest();

  // slotStart luôn có dạng "YYYY-MM-DDTHH:mm:00+07:00" (buildStoreDateTime).
  const time = slotStart.slice(11, 16);
  const failure = getChangeFailure(time, slotFull);
  if (failure) throw failure;

  const { totalMinutes, staffRequired } = summarizeSelection(pet, selected);
  return {
    ...current,
    petId,
    petName: pet.name,
    sizeGroup: pet.sizeGroup,
    status: "Pending",
    slotStart,
    slotEnd: buildStoreDateTime(slotStart.slice(0, 10), addMinutesToTime(time, totalMinutes)),
    staffRequired: staffRequired >= 2 ? 2 : 1,
    services: selected.map(({ service }) => ({ serviceId: service.serviceId, name: service.name, isDone: false })),
    staff: [],
    updatedAt: new Date().toISOString(),
  };
}

function applyHotelChange(current: AppointmentDetail, request: UpdateAppointmentRequest): AppointmentDetail {
  const { petId, plannedCheckIn, plannedCheckOut } = request;
  if (!petId || !plannedCheckIn || !plannedCheckOut) throw invalidRequest();

  const pet = MOCK_PETS.find((item) => item.petId === petId);
  if (!pet) throw invalidRequest();
  const nights = countNights(plannedCheckIn, plannedCheckOut);
  if (nights < 1) throw invalidRequest();

  // plannedCheckOut luôn có dạng "YYYY-MM-DDTHH:mm:00+07:00" (buildStoreDateTime).
  const failure = getChangeFailure(plannedCheckOut.slice(11, 16), noCapacity);
  if (failure) throw failure;
  if (nights > MAX_AVAILABLE_NIGHTS) throw noCapacity();

  return {
    ...current,
    petId,
    petName: pet.name,
    sizeGroup: pet.sizeGroup,
    status: "Pending",
    plannedCheckIn,
    plannedCheckOut,
    cageId: null,
    updatedAt: new Date().toISOString(),
  };
}

export type UpdateAppointmentParams = {
  appointmentId: string;
  request: UpdateAppointmentRequest;
};

export async function mockUpdateAppointment({ appointmentId, request }: UpdateAppointmentParams): Promise<StatusResult> {
  await wait();
  const current = getMockAppointmentForChange(appointmentId);
  const next = current.type === "Spa" ? applySpaChange(current, request) : applyHotelChange(current, request);
  replaceMockAppointment(next);
  return { status: "Pending" };
}

