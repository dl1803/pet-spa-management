import { apiClient } from "@/lib/api/client";
import type {
  AppointmentDetail,
  AppointmentPage,
  AppointmentStatus,
  AppointmentType,
  HotelBookingCreated,
  HotelBookingRequest,
  Photo,
  PhotoCreated,
  PhotoKind,
  ServiceProgressRequest,
  SpaBookingCreated,
  SpaBookingRequest,
  SpaSlots,
  StatusResult,
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

// POST /appointments/{id}/start (startAppointment): Received → InProgress. 409 PHOTO_REQUIRED, COST_CONFIRMATION_PENDING, INVALID_TRANSITION.
export async function startAppointment(appointmentId: string) {
  const { data } = await apiClient.post<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}/start`);
  return data;
}

export type MarkServiceDoneVariables = {
  appointmentId: string;
  serviceId: string;
  note?: string;
};

// PATCH /appointments/{id}/services/{serviceId} (updateServiceProgress): đánh dấu dịch vụ xong, 200 không có body. 409 INVALID_TRANSITION.
// Ghi chú không bắt buộc: chỉ gửi khi còn nội dung sau khi cắt khoảng trắng.
export async function markServiceDone({ appointmentId, serviceId, note }: MarkServiceDoneVariables) {
  const trimmedNote = note?.trim();
  const body: ServiceProgressRequest = trimmedNote ? { isDone: true, note: trimmedNote } : { isDone: true };
  await apiClient.patch(`/appointments/${encodeURIComponent(appointmentId)}/services/${encodeURIComponent(serviceId)}`, body);
}

// POST /appointments/{id}/complete (completeAppointment): InProgress → Completed. 409 PHOTO_REQUIRED, SERVICES_INCOMPLETE, INVALID_TRANSITION.
export async function completeAppointment(appointmentId: string) {
  const { data } = await apiClient.post<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}/complete`);
  return data;
}

// GET /appointments/{id}/photos (listPhotos): mảng ảnh theo thứ tự tải lên, không phân trang; `url` là URL tạm thời (60 phút).
export async function listPhotos(appointmentId: string) {
  const { data } = await apiClient.get<Photo[]>(`/appointments/${encodeURIComponent(appointmentId)}/photos`);
  return data;
}

export type UploadPhotoVariables = {
  appointmentId: string;
  kind: PhotoKind;
  file: File;
  // Phần trăm đã gửi (0–100), chỉ gọi khi biết tổng dung lượng.
  onProgress?: (percent: number) => void;
};

// POST /appointments/{id}/photos (uploadPhoto): multipart/form-data { kind, file }, 201 { photoId }.
// `apiClient` đặt sẵn Content-Type JSON nên phải ghi đè: nếu giữ nguyên, Axios đổi FormData thành JSON và mất tệp ảnh.
export async function uploadPhoto({ appointmentId, kind, file, onProgress }: UploadPhotoVariables) {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", file, file.name);
  const { data } = await apiClient.post<PhotoCreated>(`/appointments/${encodeURIComponent(appointmentId)}/photos`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    },
  });
  return data;
}

