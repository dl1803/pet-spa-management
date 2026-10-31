import type { ReactNode } from "react";

type TagProps = {
  tone: "suggest";
  children: ReactNode;
};

const TONE_CLASS = {
  suggest: "bg-apricot font-semibold text-ink",
} as const;

export function Tag({ tone, children }: TagProps) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-lg px-[9px] text-xs ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}
