import { apiClient } from "@/lib/api/client";
import type {
  AppointmentDetail,
  AppointmentPage,
  AppointmentStatus,
  AppointmentType,
  CancelRequest,
  ConfirmHotelRequest,
  ConfirmSpaRequest,
  HotelSuggestions,
  Photo,
  SpaSuggestions,
  StatusResult,
  UpdateAppointmentRequest,
} from "@/lib/api/types";

// Chỉ khai báo tham số màn đang dùng; openapi còn `petId`. `date` (YYYY-MM-DD, ngày theo múi giờ cửa hàng) có trong openapi; màn Tổng quan vẫn lọc lại theo ngày ở web (UI-Screens G-06).
export type ListAppointmentsParams = {
  type?: AppointmentType;
  status?: AppointmentStatus;
  date?: string;
  page?: number;
  pageSize?: number;
};

// GET /appointments (listAppointments): Quản lý nhận lịch toàn cửa hàng, lịch tạo sớm nhất trước.
export async function listAppointments(params: ListAppointmentsParams) {
  const { data } = await apiClient.get<AppointmentPage>("/appointments", { params });
  return data;
}

// GET /appointments/{id}/suggestions (getSuggestions): chỉ Quản lý, lịch phải đang Chờ xác nhận (409 INVALID_TRANSITION nếu không).
// Cùng đường dẫn, hai dạng phản hồi theo loại lịch: getSuggestions dùng cho lịch spa (SpaSuggestions), getHotelSuggestions cho lịch lưu trú (HotelSuggestions).
export async function getSuggestions(appointmentId: string) {
  const { data } = await apiClient.get<SpaSuggestions>(`/appointments/${encodeURIComponent(appointmentId)}/suggestions`);
  return data;
}

export async function getHotelSuggestions(appointmentId: string) {
  const { data } = await apiClient.get<HotelSuggestions>(`/appointments/${encodeURIComponent(appointmentId)}/suggestions`);
  return data;
}

// POST /appointments/{id}/confirm (confirmAppointment): lịch spa gửi { staffIds, confirmOutOfShift? }, lịch lưu trú gửi { cageId }; web chỉ cần biết thành công hay lỗi.
export async function confirmAppointment(appointmentId: string, request: ConfirmSpaRequest | ConfirmHotelRequest): Promise<void> {
  await apiClient.post(`/appointments/${encodeURIComponent(appointmentId)}/confirm`, request);
}

// POST /appointments/{id}/reject (rejectAppointment): không có body; lịch Chờ xác nhận chuyển Đã hủy, lý do StoreUnable do backend đặt.
export async function rejectAppointment(appointmentId: string): Promise<void> {
  await apiClient.post(`/appointments/${encodeURIComponent(appointmentId)}/reject`);
}

// GET /appointments/{id} (getAppointment): Quản lý xem lịch của toàn cửa hàng; 403 nếu ngoài phạm vi, 404 nếu không có.
export async function getAppointment(appointmentId: string) {
  const { data } = await apiClient.get<AppointmentDetail>(`/appointments/${encodeURIComponent(appointmentId)}`);
  return data;
}

// PUT /appointments/{id} (updateAppointment): Quản lý đổi lịch Chờ xác nhận hoặc Đã xác nhận khi can thiệp; trạng thái được giữ nguyên.
export async function updateAppointment(appointmentId: string, request: UpdateAppointmentRequest) {
  const { data } = await apiClient.put<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}`, request);
  return data;
}

// POST /appointments/{id}/cancel (cancelAppointment): Quản lý gửi { reason }; 200 { status: "Cancelled" }.
export async function cancelAppointment(appointmentId: string, request: CancelRequest) {
  const { data } = await apiClient.post<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}/cancel`, request);
  return data;
}

// GET /appointments/{id}/photos (listPhotos): Quản lý xem ảnh của mọi lịch; mảng ảnh theo thứ tự tải lên, không phân trang.
// `url` là URL tạm thời (60 phút); 403 nếu ngoài phạm vi, 404 nếu không có lịch.
export async function listPhotos(appointmentId: string) {
  const { data } = await apiClient.get<Photo[]>(`/appointments/${encodeURIComponent(appointmentId)}/photos`);
  return data;
}

