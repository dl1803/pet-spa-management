import { apiClient } from "@/lib/api/client";
import type {
  ActualWeightRequest,
  AppointmentDetail,
  AppointmentPage,
  AppointmentStatus,
  AppointmentType,
  CheckInResult,
  CostConfirmationRespondRequest,
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
  WeightCheckResponse,
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

// Chỉ khai báo tham số màn đang dùng; openapi còn `petId`. `date` (YYYY-MM-DD, ngày theo múi giờ cửa hàng) do backend lọc.
export type ListAppointmentsParams = {
  type?: AppointmentType;
  status?: AppointmentStatus;
  date?: string;
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
// `apiClient` đặt sẵn Content-Type JSON nên đặt Content-Type = undefined để Axios/trình duyệt tự sinh header multipart/form-data kèm boundary hợp lệ.
export async function uploadPhoto({ appointmentId, kind, file, onProgress }: UploadPhotoVariables) {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", file, file.name);
  const { data } = await apiClient.post<PhotoCreated>(`/appointments/${encodeURIComponent(appointmentId)}/photos`, form, {
    headers: { "Content-Type": undefined },
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    },
  });
  return data;
}

export type CheckInAppointmentVariables = {
  appointmentId: string;
  request: ActualWeightRequest;
};

// POST /appointments/{id}/check-in (checkInAppointment): lịch spa gửi { actualWeightKg }, Confirmed → Received và đối chiếu cân nặng.
// Lịch lưu trú dùng cùng đường dẫn nhưng không gửi body.
// 400 VALIDATION_ERROR, 404, 409 INVALID_TRANSITION (ngoài khoảng cho phép tiếp nhận), COST_CONFIRMATION_PENDING.
export async function checkInAppointment({ appointmentId, request }: CheckInAppointmentVariables) {
  const { data } = await apiClient.post<CheckInResult>(`/appointments/${encodeURIComponent(appointmentId)}/check-in`, request);
  return data;
}

export type WeightCheckAppointmentVariables = {
  appointmentId: string;
  request: ActualWeightRequest;
};

// POST /appointments/{id}/weight-check (weightCheckAppointment): lịch lưu trú Confirmed, ghi nhận và đối chiếu cân nặng, lịch giữ nguyên trạng thái.
// 400 VALIDATION_ERROR, 404, 409 INVALID_TRANSITION, COST_CONFIRMATION_PENDING.
export async function weightCheckAppointment({ appointmentId, request }: WeightCheckAppointmentVariables) {
  const { data } = await apiClient.post<WeightCheckResponse>(`/appointments/${encodeURIComponent(appointmentId)}/weight-check`, request);
  return data;
}

export type RespondCostConfirmationVariables = {
  appointmentId: string;
  request: CostConfirmationRespondRequest;
};

// POST /appointments/{id}/cost-confirmation/respond (respondCostConfirmation): lễ tân ghi nhận phản hồi thay khách.
// accept = false → lịch Cancelled (CostNotConfirmed). 404 không có yêu cầu đang chờ; 409 COST_CONFIRMATION_EXPIRED, INVALID_TRANSITION.
export async function respondCostConfirmation({ appointmentId, request }: RespondCostConfirmationVariables) {
  const { data } = await apiClient.post<StatusResult>(
    `/appointments/${encodeURIComponent(appointmentId)}/cost-confirmation/respond`,
    request,
  );
  return data;
}

