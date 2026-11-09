// features/appointments/components/evidence-photos.tsx
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { PhotoPlaceholder, PhotoTile } from "@/features/appointments/components/photo-tile";
import { pickPhoto } from "@/features/appointments/evidence";
import type { Photo } from "@/lib/api/types";

// MW-05 vùng 4 – Ảnh minh chứng (UI-Screens.md; FR-EXE-09): quản lý chỉ xem ảnh trước và ảnh sau chăm sóc, không tải lên hay đổi ảnh.
// Ảnh do nhân viên spa tải lên ở Web Nhân viên; Web Quản lý không gọi API tải ảnh.
export function EvidencePhotos({ photos, petName }: { photos: Photo[]; petName: string }) {
  const before = pickPhoto(photos, "Before");
  const after = pickPhoto(photos, "After");

  return (
    <Card>
      <CardHeader title="Ảnh minh chứng">
        <Tag tone="default">Chỉ xem</Tag>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
          {before ? (
            <PhotoTile photo={before} alt={`Ảnh trước chăm sóc của ${petName}`} />
          ) : (
            <PhotoPlaceholder title="Chưa có ảnh trước" hint="Nhân viên spa tải lên khi tiếp nhận." />
          )}
          {after ? (
            <PhotoTile photo={after} alt={`Ảnh sau chăm sóc của ${petName}`} />
          ) : (
            <PhotoPlaceholder title="Chưa có ảnh sau" hint="Nhân viên spa tải lên khi xong." />
          )}
        </div>
      </CardBody>
    </Card>
  );
}
