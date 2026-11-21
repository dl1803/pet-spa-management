import { apiClient } from "@/lib/api/client";
import type {
  AppointmentDetail,
  AppointmentPage,
  AppointmentStatus,
  AppointmentType,
  HotelBookingCreated,
  HotelBookingRequest,
  SpaBookingCreated,
  SpaBookingRequest,
  SpaSlots,
} from "@/lib/api/types";

export type GetSpaSlotsParams = {
  date: string;
  petId: string;
  serviceIds: string[];
};

export async function getSpaSlots({ date, petId, serviceIds }: GetSpaSlotsParams) {
  const { data } = await apiClient.get<SpaSlots>("/spa/slots", {
    params: { date, petId, serviceIds: serviceIds.join(",") },
  });
  return data;
}

export async function createSpaAppointment(request: SpaBookingRequest) {
  const { data } = await apiClient.post<SpaBookingCreated>("/appointments/spa", request);
  return data;
}

export async function createHotelAppointment(request: HotelBookingRequest) {
  const { data } = await apiClient.post<HotelBookingCreated>("/appointments/hotel", request);
  return data;
}

// Chỉ khai báo tham số màn đang dùng; openapi còn `date`, `petId` (backend hiện chưa lọc theo `date`).
export type ListAppointmentsParams = {
  type?: AppointmentType;
  status?: AppointmentStatus;
  page?: number;
  pageSize?: number;
};

// GET /appointments (listAppointments): Nhân viên spa chỉ nhận lịch spa được phân công cho mình, lịch tạo sớm nhất trước.
export async function listAppointments(params: ListAppointmentsParams) {
  const { data } = await apiClient.get<AppointmentPage>("/appointments", { params });
  return data;
}

// GET /appointments/{id} (getAppointment): Nhân viên spa chỉ xem lịch được phân công; 403 nếu ngoài phạm vi, 404 nếu không có.
export async function getAppointment(appointmentId: string) {
  const { data } = await apiClient.get<AppointmentDetail>(`/appointments/${encodeURIComponent(appointmentId)}`);
  return data;
}

