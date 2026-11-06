import type { Photo } from "@/lib/api/types";
import { getExecutionFlags, getStartBlockers, type ExecutionData } from "@/features/service-execution/execution";

// Cập nhật cục bộ cho dữ liệu mô phỏng, cùng điều kiện như backend (API-Notes). Không gọi API; bỏ khi nối backend thật.

export function withPhoto(data: ExecutionData, photo: Photo): ExecutionData {
  const flags = getExecutionFlags(data.appointment.status);
  const allowed = photo.kind === "Before" ? flags.canUploadBefore : flags.canUploadAfter;
  if (!allowed) return data;
  return { ...data, photos: [...data.photos, photo] };
}

export function withStarted(data: ExecutionData): ExecutionData {
  if (!getExecutionFlags(data.appointment.status).canStart || getStartBlockers(data).length > 0) return data;
  return { ...data, appointment: { ...data.appointment, status: "InProgress" } };
}

export function withServiceDone(data: ExecutionData, serviceId: string, note: string, doneAt: string): ExecutionData {
  if (!getExecutionFlags(data.appointment.status).canMarkDone) return data;
  const services = data.appointment.services ?? [];
  const target = services.find((service) => service.serviceId === serviceId);
  if (!target || target.isDone) return data;
  const trimmedNote = note.trim();
  return {
    ...data,
    appointment: {
      ...data.appointment,
      services: services.map((service) =>
        service.serviceId === serviceId
          ? { ...service, isDone: true, doneAt, note: trimmedNote === "" ? null : trimmedNote }
          : service,
      ),
    },
  };
}
