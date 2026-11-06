import type { ReactNode } from "react";

// Màu theo `.tag-lock`, `.tag-ok` của UI demo; luôn kèm chữ nên không chỉ dựa vào màu (Design-System 7).
const toneClass = {
  lock: "bg-danger-50 text-danger",
  ok: "bg-success-50 text-success",
} as const;

export type TagTone = keyof typeof toneClass;

export function Tag({ tone, children }: { tone: TagTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-[9px] text-xs font-medium ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
