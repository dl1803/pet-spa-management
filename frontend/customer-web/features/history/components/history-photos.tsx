import { PhotoTile } from "@/components/domain/photo-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api/errors";
import type { Photo } from "@/lib/api/types";
import { getPhotoAlt, pickLatestPhoto } from "@/lib/photos";

type HistoryPhotosProps = {
  photos: Photo[] | undefined;
  error: unknown;
  isRetrying: boolean;
  onRetry: () => void;
};

// Ảnh nhỏ Trước/Sau ở thẻ lịch sử: mỗi loại một ảnh, ảnh tải lên sau cùng. Lịch chưa có ảnh thì không hiện gì.
export function HistoryPhotos({ photos, error, isRetrying, onRetry }: HistoryPhotosProps) {
  if (photos === undefined) {
    if (error !== null) {
      return (
        <div className="flex max-w-[200px] flex-col items-start gap-2 text-[13px] leading-[18px] text-muted">
          <p>{getErrorMessage(error)}</p>
          <button
            type="button"
            disabled={isRetrying}
            onClick={onRetry}
            className="font-medium text-foreground underline hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Thử lại
          </button>
        </div>
      );
    }
    return (
      <div role="status" aria-busy="true" className="flex shrink-0 gap-2">
        <span className="sr-only">Đang tải ảnh…</span>
        <Skeleton className="aspect-[4/3] w-24 rounded-xl" />
        <Skeleton className="aspect-[4/3] w-24 rounded-xl" />
      </div>
    );
  }

  const items = (["Before", "After"] as const).flatMap((kind) => {
    const photo = pickLatestPhoto(photos, kind);
    return photo === null ? [] : [photo];
  });
  if (items.length === 0) return null;

  return (
    <ul className="flex shrink-0 gap-2">
      {items.map((photo) => (
        <li key={photo.photoId} className="w-24">
          <PhotoTile photo={photo} alt={getPhotoAlt(photo.kind)} compact />
        </li>
      ))}
    </ul>
  );
}
