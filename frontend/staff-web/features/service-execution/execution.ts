import { toApiError, type ApiError } from "@/lib/api/errors";
import type { AppointmentDetail, AppointmentStatus, Pet, Photo, PhotoKind } from "@/lib/api/types";
import { formatRelativeDay, formatTime } from "@/lib/format";
import { getStoreDateKey } from "@/lib/time";

// Dữ liệu một lần mở SW-11: lịch spa (GET /appointments/{id}), hồ sơ thú cưng (GET /pets/{petId}), ảnh (GET /appointments/{id}/photos).
export type ExecutionData = {
  appointment: AppointmentDetail;
  pet: Pet;
  photos: Photo[];
};

export const MAX_PHOTO_BYTES = 50 * 1024 * 1024;

export const PHOTO_ERROR_NOT_IMAGE = "Chỉ chấp nhận tệp ảnh.";
// Câu mới, UI demo và SA 6.6 chưa có (Đề xuất).
export const PHOTO_ERROR_TOO_LARGE = "Ảnh vượt quá 50 MB, vui lòng chọn ảnh nhỏ hơn.";

export const START_BLOCKED_NO_PHOTO = "Cần ảnh trước chăm sóc hợp lệ.";
export const START_BLOCKED_COST_PENDING = "Đang chờ khách xác nhận chi phí mới.";
// Một câu cho cả hai điều kiện hoàn tất, dùng cho nút bị khóa và cho 409 PHOTO_REQUIRED / SERVICES_INCOMPLETE (UI-Screens SW-11 vùng 7, Conventions 5.2).
export const COMPLETE_BLOCKED_REASON = "Cần hoàn thành mọi dịch vụ và tải ảnh sau chăm sóc.";

// Thao tác cho phép theo trạng thái lịch (UI-Screens SW-11, API-Notes): ảnh trước và bắt đầu khi `Received`; ảnh sau, đánh dấu dịch vụ và hoàn tất khi `InProgress`.
export function getExecutionFlags(status: AppointmentStatus) {
  return {
    canUploadBefore: status === "Received",
    canStart: status === "Received",
    canUploadAfter: status === "InProgress",
    canMarkDone: status === "InProgress",
    canComplete: status === "InProgress",
  };
}

// Ảnh mới nhất của một loại; không có thì null.
export function pickLatestPhoto(photos: Photo[], kind: PhotoKind): Photo | null {
  let latest: Photo | null = null;
  for (const photo of photos) {
    if (photo.kind !== kind) continue;
    if (latest === null || Date.parse(photo.uploadedAt) > Date.parse(latest.uploadedAt)) latest = photo;
  }
  return latest;
}

export function countServices(appointment: AppointmentDetail) {
  const services = appointment.services ?? [];
  return { done: services.filter((service) => service.isDone).length, total: services.length };
}

// Lý do khóa nút “Bắt đầu thực hiện”, tính ở web từ dữ liệu đang có; backend vẫn kiểm tra lại (UI-Screens SW-11, G-13).
export function getStartBlockers({ appointment, photos }: ExecutionData): string[] {
  const reasons: string[] = [];
  if (pickLatestPhoto(photos, "Before") === null) reasons.push(START_BLOCKED_NO_PHOTO);
  if (appointment.pendingCostConfirmation != null) reasons.push(START_BLOCKED_COST_PENDING);
  return reasons;
}

// Lý do khóa nút “Hoàn tất lịch hẹn”, tính ở web từ dữ liệu đang có; backend vẫn kiểm tra lại (BR-06, BR-20; UI-Screens SW-11, G-13).
// Lịch spa phải có ít nhất một dịch vụ (openapi: SpaBookingRequest).
export function getCompleteBlockers({ appointment, photos }: ExecutionData): string[] {
  const { done, total } = countServices(appointment);
  const hasAfterPhoto = pickLatestPhoto(photos, "After") !== null;
  return total === 0 || done < total || !hasAfterPhoto ? [COMPLETE_BLOCKED_REASON] : [];
}

// Cách màn hiển thị phản hồi lỗi của `POST /appointments/{id}/complete` (openapi: 403, 409 PHOTO_REQUIRED / SERVICES_INCOMPLETE / INVALID_TRANSITION).
export type CompleteFeedback =
  | { kind: "reason"; reason: string; highlightAfterPhoto: boolean }
  | { kind: "error"; error: ApiError };

export function getCompleteFeedback(error: unknown): CompleteFeedback {
  const apiError = toApiError(error);
  if (apiError.status === 409 && apiError.code === "PHOTO_REQUIRED") {
    return { kind: "reason", reason: COMPLETE_BLOCKED_REASON, highlightAfterPhoto: true };
  }
  if (apiError.status === 409 && apiError.code === "SERVICES_INCOMPLETE") {
    return { kind: "reason", reason: COMPLETE_BLOCKED_REASON, highlightAfterPhoto: false };
  }
  return { kind: "error", error: apiError };
}

// Chỉ nhận tệp ảnh, tối đa 50 MB (SA 3.2, API-Notes); trả câu lỗi hoặc null khi hợp lệ.
export function validatePhotoFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("image/")) return PHOTO_ERROR_NOT_IMAGE;
  if (file.size > MAX_PHOTO_BYTES) return PHOTO_ERROR_TOO_LARGE;
  return null;
}

// Giây còn lại tới `expiresAt`, không âm. Hết giờ thì backend tự hủy lịch; web không tự đổi trạng thái (SA 6.6).
export function getRemainingSeconds(expiresAt: string, nowMs: number) {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - nowMs) / 1000));
}

// Thời gian trên ảnh: hôm nay “09:10 hôm nay”, còn lại như thông báo (“Hôm qua, 09:10”, “04/10, 08:30”).
export function formatPhotoTime(uploadedAt: string, todayKey: string) {
  if (getStoreDateKey(uploadedAt) === todayKey) return `${formatTime(uploadedAt)} hôm nay`;
  return formatRelativeDay(uploadedAt, todayKey);
}

// Thêm dấu chấm cuối câu nếu chưa có, để ghép các ý của “Lưu ý từ hồ sơ”.
export function endSentence(text: string) {
  const trimmed = text.trim();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}
