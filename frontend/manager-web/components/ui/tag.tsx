import type { ReactNode } from "react";

type TagProps = {
  tone: "default" | "suggest" | "ok";
  children: ReactNode;
};

const TONE_CLASS = {
  default: "bg-line-soft font-medium text-ink",
  suggest: "bg-apricot font-semibold text-ink",
  ok: "bg-success-50 font-semibold text-success",
} as const;

export function Tag({ tone, children }: TagProps) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-lg px-[9px] text-xs ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}
