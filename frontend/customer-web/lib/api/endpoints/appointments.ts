import { apiClient } from "@/lib/api/client";
import type {
  AppointmentDetail,
  AppointmentPage,
  AppointmentStatus,
  HotelBookingCreated,
  HotelBookingRequest,
  Photo,
  SpaBookingCreated,
  SpaBookingRequest,
  SpaSlots,
  StatusResult,
  UpdateAppointmentRequest,
} from "@/lib/api/types";

export type GetSpaSlotsParams = {
  // Ngày YYYY-MM-DD theo múi giờ cửa hàng.
  date: string;
  petId: string;
  serviceIds: string[];
};

// GET /spa/slots: mốc giờ spa của một ngày cho thú cưng và các dịch vụ đã chọn.
export async function getSpaSlots({ date, petId, serviceIds }: GetSpaSlotsParams) {
  // openapi: serviceIds dạng form, explode: false, tức một chuỗi "a,b,c".
  const { data } = await apiClient.get<SpaSlots>("/spa/slots", {
    params: { date, petId, serviceIds: serviceIds.join(",") },
  });
  return data;
}

// POST /appointments/spa: tạo lịch hẹn spa ở trạng thái Chờ xác nhận (201).
export async function createSpaAppointment(request: SpaBookingRequest) {
  const { data } = await apiClient.post<SpaBookingCreated>("/appointments/spa", request);
  return data;
}

// POST /appointments/hotel: tạo lịch hẹn lưu trú ở trạng thái Chờ xác nhận (201).
export async function createHotelAppointment(request: HotelBookingRequest) {
  const { data } = await apiClient.post<HotelBookingCreated>("/appointments/hotel", request);
  return data;
}

export type ListAppointmentsParams = {
  status?: AppointmentStatus;
  petId?: string;
  page?: number;
  pageSize?: number;
};

// GET /appointments: lịch hẹn của khách đang đăng nhập; backend lọc theo token (BR-16).
export async function listAppointments(params: ListAppointmentsParams) {
  const { data } = await apiClient.get<AppointmentPage>("/appointments", { params });
  return data;
}

// GET /appointments/{id}: chi tiết lịch hẹn. Lịch của khách khác trả 403 FORBIDDEN, không tìm thấy trả 404 NOT_FOUND.
export async function getAppointment(appointmentId: string) {
  const { data } = await apiClient.get<AppointmentDetail>(`/appointments/${encodeURIComponent(appointmentId)}`);
  return data;
}

// POST /appointments/{id}/cancel: khách hủy lịch hẹn của mình trong hạn tự hủy (200 { status: "Cancelled" }).
// Không gửi body: backend đặt lý do CustomerCancelled. Lỗi: 403 FORBIDDEN (lịch của khách khác), 404 NOT_FOUND,
// 409 CHANGE_WINDOW_CLOSED (quá hạn tự hủy), 409 INVALID_TRANSITION (lịch không còn Chờ xác nhận hoặc Đã xác nhận).
export async function cancelAppointment(appointmentId: string) {
  const { data } = await apiClient.post<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}/cancel`);
  return data;
}

export type UpdateAppointmentVariables = {
  appointmentId: string;
  request: UpdateAppointmentRequest;
};

// PUT /appointments/{id}: khách đổi lịch hẹn của mình trong hạn tự đổi (200 { status: "Pending" }).
// Spa gửi { petId, serviceIds, slotStart }, lưu trú gửi { petId, plannedCheckIn, plannedCheckOut }.
// Lỗi: 400 VALIDATION_ERROR, 403, 404, 409 CHANGE_WINDOW_CLOSED, SLOT_FULL, NO_CAPACITY, INVALID_TRANSITION.
export async function updateAppointment({ appointmentId, request }: UpdateAppointmentVariables) {
  const { data } = await apiClient.put<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}`, request);
  return data;
}

// GET /appointments/{id}/photos: ảnh trước/sau chăm sóc của một lịch spa, theo thứ tự tải lên, không phân trang.
// `url` là URL tạm thời (60 phút) do backend ký sau khi kiểm tra quyền sở hữu (BR-16); khóa lưu trữ không được trả.
// Lỗi: 403 FORBIDDEN (lịch của khách khác), 404 NOT_FOUND.
export async function listAppointmentPhotos(appointmentId: string) {
  const { data } = await apiClient.get<Photo[]>(`/appointments/${encodeURIComponent(appointmentId)}/photos`);
  return data;
}

