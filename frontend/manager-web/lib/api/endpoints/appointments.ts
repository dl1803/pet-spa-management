import { apiClient } from "@/lib/api/client";
import type { AppointmentPage, AppointmentStatus, AppointmentType, ConfirmSpaRequest, SpaSuggestions } from "@/lib/api/types";

// Chỉ khai báo tham số màn đang dùng; openapi còn `date`, `petId` (backend hiện chưa lọc theo `date`).
export type ListAppointmentsParams = {
  type?: AppointmentType;
  status?: AppointmentStatus;
  page?: number;
  pageSize?: number;
};

// GET /appointments (listAppointments): Quản lý nhận lịch toàn cửa hàng, lịch tạo sớm nhất trước.
export async function listAppointments(params: ListAppointmentsParams) {
  const { data } = await apiClient.get<AppointmentPage>("/appointments", { params });
  return data;
}

// GET /appointments/{id}/suggestions (getSuggestions): chỉ Quản lý, lịch phải đang Chờ xác nhận (409 INVALID_TRANSITION nếu không).
// Chỉ khai báo dạng lịch spa (SpaSuggestions); dạng lưu trú (HotelSuggestions) thuộc phần nối lưu trú.
export async function getSuggestions(appointmentId: string) {
  const { data } = await apiClient.get<SpaSuggestions>(`/appointments/${encodeURIComponent(appointmentId)}/suggestions`);
  return data;
}

// POST /appointments/{id}/confirm (confirmAppointment): lịch spa gửi { staffIds, confirmOutOfShift? }; web chỉ cần biết thành công hay lỗi.
export async function confirmAppointment(appointmentId: string, request: ConfirmSpaRequest): Promise<void> {
  await apiClient.post(`/appointments/${encodeURIComponent(appointmentId)}/confirm`, request);
}

// POST /appointments/{id}/reject (rejectAppointment): không có body; lịch Chờ xác nhận chuyển Đã hủy, lý do StoreUnable do backend đặt.
export async function rejectAppointment(appointmentId: string): Promise<void> {
  await apiClient.post(`/appointments/${encodeURIComponent(appointmentId)}/reject`);
}
