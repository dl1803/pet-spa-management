"use client";

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { FieldError } from "@/components/feedback/field-error";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { validatePhotoFile } from "@/features/service-execution/execution";

// Khung nét đứt chung cho ô tải ảnh và ô chưa thể tải (UI demo `.upload-box`).
export function PhotoDropZone({
  title,
  hint,
  muted = false,
  children,
}: {
  title: string;
  hint: string;
  muted?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed border-[#A9C3C8] bg-mist px-4 py-[22px] text-center text-muted ${
        muted ? "opacity-60" : ""
      }`}
    >
      <span className="grid size-11 place-items-center rounded-xl border border-line bg-white text-lagoon">
        <Icon name="camera" className="size-5" />
      </span>
      <strong className="font-semibold text-ink">{title}</strong>
      <span className="text-xs">{hint}</span>
      {children}
    </div>
  );
}

type PhotoUploadProps = {
  title: string;
  inputId: string;
  onSelect: (file: File) => void;
};

// SW-11 vùng 3, 4 – Ô tải ảnh: chọn hoặc chụp ảnh, kiểm tra tệp trước khi nhận (UI-Screens.md).
export function PhotoUpload({ title, inputId, onSelect }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const errorId = `${inputId}-error`;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Đặt lại để chọn lại cùng một tệp vẫn kích hoạt sự kiện.
    event.target.value = "";
    if (!file) return;

    const message = validatePhotoFile(file);
    setError(message);
    if (message === null) onSelect(file);
  }

  return (
    <PhotoDropZone title={title} hint="Chỉ nhận tệp ảnh">
      <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} aria-describedby={error ? errorId : undefined}>
        Tải ảnh lên
      </Button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        hidden
        aria-label={title}
        onChange={handleChange}
      />
      <div aria-live="polite">
        <FieldError id={errorId} message={error ?? undefined} />
      </div>
    </PhotoDropZone>
  );
}
