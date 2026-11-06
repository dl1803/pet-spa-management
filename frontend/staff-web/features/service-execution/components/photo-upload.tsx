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

// Chọn tệp, kiểm tra tệp rồi báo lên: dùng chung cho ô tải ảnh và nút “Đổi ảnh”.
function usePhotoPicker(inputId: string, onSelect: (file: File) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Đặt lại để chọn lại cùng một tệp vẫn kích hoạt sự kiện.
    event.target.value = "";
    if (!file) return;

    const message = validatePhotoFile(file);
    setError(message);
    if (message === null) onSelect(file);
  }

  return { inputRef, error, errorId: `${inputId}-error`, open: () => inputRef.current?.click(), handleChange };
}

// SW-11 vùng 3, 4 – Ô tải ảnh: chọn hoặc chụp ảnh, kiểm tra tệp trước khi nhận (UI-Screens.md).
export function PhotoUpload({ title, inputId, onSelect }: PhotoUploadProps) {
  const { inputRef, error, errorId, open, handleChange } = usePhotoPicker(inputId, onSelect);

  return (
    <PhotoDropZone title={title} hint="Chỉ nhận tệp ảnh">
      <Button variant="secondary" size="sm" onClick={open} aria-describedby={error ? errorId : undefined}>
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

// SW-11 vùng 3, 4 – Nút “Đổi ảnh” khi đã có ảnh và lịch còn cho tải (Đề xuất: UI-Screens chưa có). Tệp sai thì báo lỗi và giữ ảnh cũ.
export function PhotoReplace({ label, inputId, onSelect }: { label: string; inputId: string; onSelect: (file: File) => void }) {
  const { inputRef, error, errorId, open, handleChange } = usePhotoPicker(inputId, onSelect);

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="secondary" size="sm" onClick={open} aria-label={label} aria-describedby={error ? errorId : undefined}>
        <Icon name="camera" className="size-4" />
        Đổi ảnh
      </Button>
      <input ref={inputRef} id={inputId} type="file" accept="image/*" hidden aria-label={label} onChange={handleChange} />
      <div aria-live="polite">
        <FieldError id={errorId} message={error ?? undefined} />
      </div>
    </div>
  );
}
