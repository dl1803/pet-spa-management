import { Alert } from "@/components/feedback/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { PhotoTile } from "@/features/service-execution/components/photo-tile";
import { PhotoDropZone, PhotoReplace, PhotoUpload } from "@/features/service-execution/components/photo-upload";
import type { Photo } from "@/lib/api/types";

type PhotoCardProps = {
  photo: Photo | null;
  petName: string;
  todayKey: string;
  canUpload: boolean;
  onUpload: (file: File) => void;
};

// SW-11 vùng 3 – Ảnh trước chăm sóc (UI-Screens.md). “Hợp lệ” khi lịch đang mở có ảnh Before; điều kiện cuối cùng do backend quyết (UI-Screens G-13).
export function BeforePhotoCard({ photo, petName, todayKey, canUpload, onUpload }: PhotoCardProps) {
  return (
    <Card>
      <CardHeader title="Ảnh trước chăm sóc">
        {photo ? <Tag tone="ok">Hợp lệ</Tag> : <Tag tone="lock">Chưa hợp lệ</Tag>}
      </CardHeader>
      <CardBody>
        {photo ? (
          <div className="flex flex-col gap-3">
            <PhotoTile photo={photo} alt={`Ảnh trước chăm sóc của ${petName}`} todayKey={todayKey} />
            {canUpload && <PhotoReplace label="Đổi ảnh trước chăm sóc" inputId="before-photo-replace" onSelect={onUpload} />}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Câu mới, UI demo chưa có vì API không trả ngày ảnh gần nhất (UI-Screens G-13) (Đề xuất). */}
            <Alert tone="warn" icon="image" className="px-3 py-2.5 text-[13px] leading-[18px]">
              Lịch này chưa có ảnh trước chăm sóc. Cần chụp ảnh mới.
            </Alert>
            {canUpload && <PhotoUpload title="Chụp hoặc chọn ảnh trước chăm sóc" inputId="before-photo" onSelect={onUpload} />}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// SW-11 vùng 4 – Ảnh sau chăm sóc (UI-Screens.md): chỉ tải được khi lịch đang thực hiện.
export function AfterPhotoCard({ photo, petName, todayKey, canUpload, onUpload }: PhotoCardProps) {
  return (
    <Card>
      <CardHeader title="Ảnh sau chăm sóc">{photo && <Tag tone="ok">Đã có</Tag>}</CardHeader>
      <CardBody>
        {photo ? (
          <div className="flex flex-col gap-3">
            <PhotoTile photo={photo} alt={`Ảnh sau chăm sóc của ${petName}`} todayKey={todayKey} />
            {canUpload && <PhotoReplace label="Đổi ảnh sau chăm sóc" inputId="after-photo-replace" onSelect={onUpload} />}
          </div>
        ) : canUpload ? (
          <PhotoUpload title="Chụp ảnh sau khi xong mọi dịch vụ" inputId="after-photo" onSelect={onUpload} />
        ) : (
          <PhotoDropZone title="Chưa thể tải ảnh sau" hint="Tải được khi lịch đang thực hiện." muted />
        )}
      </CardBody>
    </Card>
  );
}
