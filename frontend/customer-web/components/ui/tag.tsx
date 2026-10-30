import type { ReactNode } from "react";

const toneClass = {
  default: "bg-line-soft font-medium",
  size: "border border-line bg-white font-semibold",
};

export function Tag({ tone = "default", children }: { tone?: keyof typeof toneClass; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-[9px] text-xs text-ink ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

