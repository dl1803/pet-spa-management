import { apiClient } from "@/lib/api/client";
import type { AppointmentPage, AppointmentStatus, AppointmentType } from "@/lib/api/types";

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
