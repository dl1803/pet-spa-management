import type { Photo } from "@/lib/api/types";
import { formatPhotoTime } from "@/features/service-execution/execution";

type PhotoTileProps = {
  photo: Photo;
  alt: string;
  todayKey: string;
};

// Ảnh 4:3 có nhãn Trước (nền trắng) / Sau (nền Lagoon) và dải thời gian (UI-Screens SW-11 vùng 3, 4; Design-System 4.3 PhotoTile).
// URL ảnh là URL tạm thời của backend (hoặc ảnh đã chọn trên máy), không qua tối ưu ảnh của Next.js (Frontend-Architecture mục 9).
export function PhotoTile({ photo, alt, todayKey }: PhotoTileProps) {
  const isBefore = photo.kind === "Before";

  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-xl bg-line-soft">
      {/* eslint-disable-next-line @next/next/no-img-element -- URL tạm thời, không dùng next/image */}
      <img src={photo.url} alt={alt} className="size-full object-cover" />
      <span
        className={`absolute left-2.5 top-2.5 rounded-[7px] px-2 py-0.5 text-xs font-semibold ${
          isBefore ? "bg-white text-ink" : "bg-lagoon text-white"
        }`}
      >
        {isBefore ? "Trước" : "Sau"}
      </span>
      <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/65 to-transparent px-2.5 pb-2 pt-[18px] text-xs leading-4 text-white">
        {formatPhotoTime(photo.uploadedAt, todayKey)}
      </figcaption>
    </figure>
  );
}
