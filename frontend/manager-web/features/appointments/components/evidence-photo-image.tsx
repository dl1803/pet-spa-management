"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

export function EvidencePhotoImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div role="img" aria-label={`${alt}. Không tải được ảnh.`} className="grid size-full place-content-center justify-items-center gap-2 p-4 text-center text-sm text-muted">
        <Icon name="image" />
        <span>Không tải được ảnh</span>
      </div>
    );
  }

  // Ảnh từ HTML server có thể lỗi trước khi React gắn onError.
  const checkLoadedImage = (image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL tạm thời, không dùng next/image
    <img src={src} alt={alt} className="size-full object-cover" ref={checkLoadedImage} onError={() => setFailed(true)} />
  );
}
