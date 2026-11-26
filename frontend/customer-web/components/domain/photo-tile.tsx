"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import type { Photo } from "@/lib/api/types";
import { formatPhotoStamp } from "@/lib/format";
import { PHOTO_KIND_LABELS } from "@/lib/labels";

type PhotoTileProps = {
  photo: Photo;
  alt: string;
  // Ảnh nhỏ ở lịch sử dịch vụ: chỉ có nhãn Trước/Sau, không có dải thời gian.
  compact?: boolean;
};

function PhotoImage({ src, alt, compact }: { src: string; alt: string; compact: boolean }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt}. Không tải được ảnh.`}
        className="grid size-full place-content-center justify-items-center gap-1.5 p-2 text-center text-muted"
      >
        <Icon name="image" className={compact ? "size-4" : "size-5"} />
        {!compact && <span className="text-[13px] leading-[18px]">Không tải được ảnh</span>}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL tạm thời của backend, không đi qua tối ưu ảnh của next/image
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="size-full object-cover" />
  );
}

export function PhotoTile({ photo, alt, compact = false }: PhotoTileProps) {
  const isBefore = photo.kind === "Before";
  const labelSize = compact ? "left-1.5 top-1.5 px-1.5 text-[11px] leading-4" : "left-2.5 top-2.5 px-2 py-0.5 text-xs";
  const labelColor = isBefore ? "bg-white text-ink" : "bg-lagoon text-white";

  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-xl bg-line-soft">
      {/* key theo url: khi tải lại ra URL mới thì thử hiển thị lại thay vì giữ trạng thái lỗi cũ. */}
      <PhotoImage key={photo.url} src={photo.url} alt={alt} compact={compact} />
      <span className={`absolute rounded-[7px] font-semibold ${labelSize} ${labelColor}`}>
        {PHOTO_KIND_LABELS[photo.kind]}
      </span>
      {!compact && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/65 to-transparent px-2.5 pb-2 pt-[18px] text-xs leading-4 text-white">
          {formatPhotoStamp(photo.uploadedAt)}
        </figcaption>
      )}
    </figure>
  );
}
