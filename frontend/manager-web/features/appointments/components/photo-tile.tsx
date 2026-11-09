// features/appointments/components/photo-tile.tsx
import { Icon } from "@/components/icons";
import { formatPhotoStamp } from "@/features/appointments/evidence";
import type { Photo } from "@/lib/api/types";

// Ảnh 4:3 có nhãn Trước (nền trắng) / Sau (nền Lagoon) và dải thời gian tải lên (UI-Screens MW-05 vùng 4; Design-System 4.3 PhotoTile).
// URL ảnh là URL tạm thời của backend, không qua tối ưu ảnh của Next.js (Frontend-Architecture mục 9).
export function PhotoTile({ photo, alt }: { photo: Photo; alt: string }) {
  const isBefore = photo.kind === "Before";

  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-xl bg-line-soft">
      {/* eslint-disable-next-line @next/next/no-img-element -- URL tạm thời, không dùng next/image */}
      <img src={photo.url} alt={alt} className="size-full object-cover" />
      <span
        className={`absolute left-2.5 top-2.5 rounded-[7px] px-2 py-0.5 text-xs font-semibold ${isBefore ? "bg-white text-ink" : "bg-lagoon text-white"}`}
      >
        {isBefore ? "Trước" : "Sau"}
      </span>
      <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/65 to-transparent px-2.5 pb-2 pt-[18px] text-xs leading-4 text-white">
        {formatPhotoStamp(photo.uploadedAt)}
      </figcaption>
    </figure>
  );
}

// Ô trống khi chưa có ảnh: nét đứt, biểu tượng và lời giải thích ai sẽ tải ảnh.
export function PhotoPlaceholder({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-line bg-mist p-4 text-center">
      <div className="flex flex-col items-center gap-1.5">
        <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-white text-muted">
          <Icon name="image" />
        </span>
        <div className="font-semibold">{title}</div>
        <div className="text-[13px] leading-[18px] text-muted">{hint}</div>
      </div>
    </div>
  );
}
