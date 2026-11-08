import type { Photo } from "@/lib/api/types";
import { ApiError } from "@/lib/api/errors";
import { countServices, getExecutionFlags, getStartBlockers, pickLatestPhoto, type ExecutionData } from "@/features/service-execution/execution";

// Cập nhật cục bộ cho dữ liệu mô phỏng, cùng điều kiện như backend (API-Notes). Không gọi API; bỏ khi nối backend thật.

export function withPhoto(data: ExecutionData, photo: Photo): ExecutionData {
  const flags = getExecutionFlags(data.appointment.status);
  const allowed = photo.kind === "Before" ? flags.canUploadBefore : flags.canUploadAfter;
  if (!allowed) return data;
  // Bỏ ảnh cũ cùng loại để màn luôn hiển thị ảnh vừa chọn, kể cả khi đồng hồ thay đổi.
  // Khi đó URL xem trước cũ có thể được thu hồi an toàn.
  return { ...data, photos: [...data.photos.filter((existing) => existing.kind !== photo.kind), photo] };
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

// Kết quả mô phỏng của `POST /appointments/{id}/complete`.
export type CompleteResult = { ok: true; data: ExecutionData } | { ok: false; error: ApiError };

// Title và detail lấy từ ErrorCatalog của backend để lỗi mô phỏng giống lỗi thật.
function conflict(code: string, title: string, detail: string): CompleteResult {
  return { ok: false, error: new ApiError({ kind: "http", status: 409, code, title, detail }) };
}

// Mô phỏng backend kiểm tra lại khi hoàn tất (BR-06, BR-20; API-Notes mục 5, 7): sai trạng thái, còn dịch vụ chưa xong, chưa có ảnh sau.
export function completeLocally(data: ExecutionData): CompleteResult {
  if (!getExecutionFlags(data.appointment.status).canComplete) {
    return conflict(
      "INVALID_TRANSITION",
      "Sai trình tự trạng thái",
      "Không thể chuyển lịch hẹn sang trạng thái này ở thời điểm hiện tại.",
    );
  }
  const { done, total } = countServices(data.appointment);
  if (done < total) {
    return conflict(
      "SERVICES_INCOMPLETE",
      "Chưa hoàn thành dịch vụ",
      "Cần hoàn thành tất cả dịch vụ trong lịch hẹn trước khi hoàn tất.",
    );
  }
  if (pickLatestPhoto(data.photos, "After") === null) {
    return conflict(
      "PHOTO_REQUIRED",
      "Thiếu ảnh minh chứng",
      "Cần có ảnh trước/sau hợp lệ để thực hiện thao tác này.",
    );
  }
  return { ok: true, data: { ...data, appointment: { ...data.appointment, status: "Completed" } } };
}
