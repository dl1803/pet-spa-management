import type { Appointment, Photo, PhotoKind } from "@/lib/api/types";

// Khối ảnh trước/sau ở chi tiết lịch hẹn.
// hidden: không hiện (lịch lưu trú, lịch spa đã hủy; UI demo ẩn khối ở các lịch này).
// awaiting: lịch spa Chờ xác nhận / Đã xác nhận, chưa thể có ảnh (backend chỉ nhận ảnh khi lịch Đã tiếp nhận hoặc
//   Đang thực hiện): chỉ hiện lời nhắn, không gọi API.
// live: lịch spa Đã tiếp nhận / Đang thực hiện / Hoàn tất: gọi API ảnh.
export type PhotoSectionMode = "hidden" | "awaiting" | "live";

export function getPhotoSectionMode({ type, status }: Pick<Appointment, "type" | "status">): PhotoSectionMode {
  if (type !== "Spa") return "hidden";
  switch (status) {
    case "Pending":
    case "Confirmed":
      return "awaiting";
    case "Received":
    case "InProgress":
    case "Completed":
      return "live";
    default:
      return "hidden";
  }
}

const KIND_ORDER: Record<PhotoKind, number> = { Before: 0, After: 1 };

// Ảnh Trước đứng trước ảnh Sau; cùng loại theo thời điểm tải lên (cũ trước). Không lọc theo tuổi ảnh: mốc 7 ngày
// (BR-20) chỉ là điều kiện để bắt đầu thực hiện dịch vụ, không phải hạn xem ảnh.
export function sortPhotosForDisplay(photos: Photo[]): Photo[] {
  return [...photos].sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || Date.parse(a.uploadedAt) - Date.parse(b.uploadedAt),
  );
}

// Ảnh tải lên sau cùng của một loại; null khi lịch chưa có ảnh loại đó.
export function pickLatestPhoto(photos: Photo[], kind: PhotoKind): Photo | null {
  let latest: Photo | null = null;
  let latestTime = -Infinity;
  for (const photo of photos) {
    if (photo.kind !== kind) continue;
    const time = Date.parse(photo.uploadedAt);
    if (!Number.isNaN(time) && time >= latestTime) {
      latest = photo;
      latestTime = time;
    }
  }
  return latest;
}

export function getPhotoAlt(kind: PhotoKind): string {
  return kind === "Before" ? "Ảnh trước chăm sóc" : "Ảnh sau chăm sóc";
}
