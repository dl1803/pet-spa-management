import type { PhotoKind } from "@/lib/api/types";

// Giữ URL ảnh xem trước (URL.createObjectURL) đang dùng theo loại ảnh: đổi ảnh thì thu hồi URL cũ cùng loại, rời màn thì thu hồi hết.
// Hàm thu hồi được truyền vào để kiểm thử không cần trình duyệt.
export function createPhotoUrlTracker(revoke: (url: string) => void) {
  const current = new Map<PhotoKind, string>();
  return {
    replace(kind: PhotoKind, url: string) {
      const previous = current.get(kind);
      current.set(kind, url);
      if (previous !== undefined && previous !== url) revoke(previous);
    },
    revokeAll() {
      for (const url of current.values()) revoke(url);
      current.clear();
    },
  };
}
