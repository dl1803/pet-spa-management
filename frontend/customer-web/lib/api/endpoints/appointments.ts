import { apiClient } from "@/lib/api/client";
import type {
  AppointmentDetail,
  AppointmentPage,
  AppointmentStatus,
  HotelBookingCreated,
  HotelBookingRequest,
  SpaBookingCreated,
  SpaBookingRequest,
  SpaSlots,
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
