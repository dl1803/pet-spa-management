import { PhotoTile } from "@/components/domain/photo-tile";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Photo } from "@/lib/api/types";
import { getPhotoAlt, sortPhotosForDisplay } from "@/lib/photos";

const PHOTO_GRID = "grid grid-cols-[repeat(auto-fill,minmax(180px,240px))] gap-3";

type AppointmentPhotosCardProps = {
  // true khi lịch spa chưa thể có ảnh (Chờ xác nhận, Đã xác nhận): chỉ hiện lời nhắn, không có dữ liệu ảnh.
  isAwaiting: boolean;
  photos: Photo[] | undefined;
  error: unknown;
  isRetrying: boolean;
  onRetry: () => void;
};

function PhotosPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-5 text-center">
      <span aria-hidden="true" className="grid size-16 place-items-center rounded-[20px] bg-lagoon-50 text-lagoon">
        <Icon name="camera" className="size-7" />
      </span>
      <p className="max-w-[340px] text-sm leading-5 text-muted">
        Nhân viên spa sẽ chụp ảnh bé trước khi bắt đầu và sau khi hoàn tất. Ảnh hiện ở đây.
      </p>
    </div>
  );
}

export function AppointmentPhotosCard({ isAwaiting, photos, error, isRetrying, onRetry }: AppointmentPhotosCardProps) {
  let body;
  if (isAwaiting || (photos !== undefined && photos.length === 0)) {
    body = <PhotosPlaceholder />;
  } else if (photos !== undefined) {
    body = (
      <ul className={PHOTO_GRID}>
        {sortPhotosForDisplay(photos).map((photo) => (
          <li key={photo.photoId}>
            <PhotoTile photo={photo} alt={getPhotoAlt(photo.kind)} />
          </li>
        ))}
      </ul>
    );
  } else if (error !== null) {
    body = (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={error} />
        <Button variant="secondary" size="sm" disabled={isRetrying} onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    );
  } else {
    body = (
      <div role="status" aria-busy="true">
        <span className="sr-only">Đang tải ảnh…</span>
        <div className={PHOTO_GRID}>
          <Skeleton className="aspect-[4/3] rounded-xl" />
          <Skeleton className="aspect-[4/3] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader title="Ảnh trước và sau chăm sóc" />
      <CardBody>{body}</CardBody>
    </Card>
  );
}
