import { ApiError } from "@/lib/api/errors";
import type { AppointmentDetail, Photo, StatusResult } from "@/lib/api/types";
import { pickPhoto } from "./evidence";
import { SPA_STATUS_STEPS, STATUS_MESSAGES, type SpaStatusAction } from "./status-update";

function conflict(code: string, detail: string): ApiError {
  return new ApiError({ kind: "http", status: 409, code, title: "Không thể chuyển trạng thái.", detail });
}

// Mô phỏng POST /appointments/{id}/start và /complete (openapi startAppointment, completeAppointment).
// Không đọc đồng hồ, không sửa tham số; trả StatusResult như API.
export function advanceMockSpaStatus(appointment: AppointmentDetail, photos: Photo[], action: SpaStatusAction): StatusResult {
  const step = SPA_STATUS_STEPS.find((item) => item.action === action);
  if (!step || step.from !== appointment.status) throw conflict("INVALID_TRANSITION", STATUS_MESSAGES.stale);

  if (action === "start") {
    if (pickPhoto(photos, "Before") === null) throw conflict("PHOTO_REQUIRED", STATUS_MESSAGES.beforePhotoRequired);
    if (appointment.pendingCostConfirmation?.status === "Pending") {
      throw conflict("COST_CONFIRMATION_PENDING", STATUS_MESSAGES.costConfirmationPending);
    }
  } else {
    const services = appointment.services ?? [];
    if (services.length === 0 || !services.every((service) => service.isDone)) {
      throw conflict("SERVICES_INCOMPLETE", STATUS_MESSAGES.completionRequired);
    }
    if (pickPhoto(photos, "After") === null) throw conflict("PHOTO_REQUIRED", STATUS_MESSAGES.completionRequired);
  }
  return { status: step.to };
}
