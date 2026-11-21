import { ApiError, toApiError } from "@/lib/api/errors";
import type { AppointmentDetail, AppointmentStatus, Photo } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";
import { pickPhoto } from "./evidence";
import { isStaleAppointmentError } from "./intervention-error";

// FR-EXE-05: Quản lý cập nhật trực tiếp trạng thái thực hiện lịch spa; chỉ hai bước start, complete (openapi x-fr, Authorization).
export type SpaStatusAction = "start" | "complete";

export type SpaStatusStep = {
  action: SpaStatusAction;
  from: Extract<AppointmentStatus, "Received" | "InProgress">;
  to: Extract<AppointmentStatus, "InProgress" | "Completed">;
  label: string;
};

export const SPA_STATUS_STEPS: SpaStatusStep[] = [
  { action: "start", from: "Received", to: "InProgress", label: "Bắt đầu thực hiện" },
  { action: "complete", from: "InProgress", to: "Completed", label: "Chuyển sang Hoàn tất" },
];

export function getSpaStatusStep(status: AppointmentStatus): SpaStatusStep | null {
  return SPA_STATUS_STEPS.find((step) => step.from === status) ?? null;
}

// Câu theo UI-Screens (MW-05 vùng 7, SW-11 vùng 7) và Frontend-Conventions 5.2.
export const STATUS_MESSAGES = {
  beforePhotoRequired: "Cần ảnh trước chăm sóc hợp lệ.",
  costConfirmationPending: "Đang chờ khách xác nhận chi phí mới.",
  completionRequired: "Cần hoàn thành mọi dịch vụ và tải ảnh sau chăm sóc.",
  stale: "Lịch hẹn đã thay đổi trạng thái, vui lòng tải lại.",
  lifecycleNote: "Chỉ chuyển được sang bước kế tiếp đúng vòng đời. Thao tác được lưu tên người thực hiện.",
} as const;

export function describeNoStep(status: AppointmentStatus): string {
  switch (status) {
    case "Pending":
      return "Lịch hẹn đang chờ xác nhận nên chưa có bước thực hiện.";
    case "Confirmed":
      return "Lịch hẹn chưa được tiếp nhận nên chưa có bước thực hiện.";
    case "Completed":
      return "Lịch hẹn đã hoàn tất, không còn bước kế tiếp.";
    case "Cancelled":
      return "Lịch hẹn đã hủy, không còn bước kế tiếp.";
    default:
      return "Chưa có bước kế tiếp.";
  }
}

// Lý do khóa nút, tính ở web từ dữ liệu đang có; backend vẫn kiểm tra lại (409). Rỗng = bấm được.
// start: ảnh Before của lịch (UI-Screens G-13) và không chờ xác nhận chi phí (BR-20, BR-23).
// complete: mọi dịch vụ xong và có ảnh After (BR-06, BR-20); thiếu dữ liệu dịch vụ coi là chưa đủ điều kiện.
export function getStatusLockReasons(step: SpaStatusStep, appointment: AppointmentDetail, photos: Photo[]): string[] {
  if (step.action === "start") {
    const reasons: string[] = [];
    if (pickPhoto(photos, "Before") === null) reasons.push(STATUS_MESSAGES.beforePhotoRequired);
    if (appointment.pendingCostConfirmation?.status === "Pending") reasons.push(STATUS_MESSAGES.costConfirmationPending);
    return reasons;
  }
  const services = appointment.services ?? [];
  const allDone = services.length > 0 && services.every((service) => service.isDone);
  return allDone && pickPhoto(photos, "After") !== null ? [] : [STATUS_MESSAGES.completionRequired];
}

export function buildStatusSuccessMessage(step: SpaStatusStep, appointment: AppointmentDetail): string {
  const code = formatAppointmentCode(appointment.appointmentId);
  if (step.action === "complete") return `Đã hoàn tất ${code}. Bàn giao ${appointment.petName ?? "thú cưng"} ra quầy.`;
  return `Đã chuyển ${code} sang ${APPOINTMENT_STATUS_LABELS[step.to]}.`;
}

export type StatusUpdateFailure =
  | { kind: "reason"; message: string } // lý do dưới nút
  | { kind: "error"; error: unknown }; // ErrorAlert

// Frontend-Conventions 5.2: PHOTO_REQUIRED, SERVICES_INCOMPLETE, COST_CONFIRMATION_PENDING → lý do dưới nút;
// INVALID_TRANSITION, NOT_FOUND → ErrorAlert với detail (dự phòng câu stale); lỗi khác → ErrorAlert.
export function classifyStatusUpdateError(error: unknown, action: SpaStatusAction): StatusUpdateFailure {
  const apiError = toApiError(error);
  if (apiError.status === 409) {
    if (apiError.code === "COST_CONFIRMATION_PENDING") return { kind: "reason", message: STATUS_MESSAGES.costConfirmationPending };
    if (apiError.code === "SERVICES_INCOMPLETE") return { kind: "reason", message: STATUS_MESSAGES.completionRequired };
    if (apiError.code === "PHOTO_REQUIRED") {
      return { kind: "reason", message: action === "start" ? STATUS_MESSAGES.beforePhotoRequired : STATUS_MESSAGES.completionRequired };
    }
  }
  if (isStaleAppointmentError(apiError)) {
    return {
      kind: "error",
      error: new ApiError({ kind: "http", status: apiError.status, code: apiError.code, detail: apiError.detail?.trim() || STATUS_MESSAGES.stale }),
    };
  }
  return { kind: "error", error };
}
