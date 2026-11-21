import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

// Màu theo token: warn = Apricot nhạt (chờ xác nhận chi phí), neutral = nền xám nhạt (Design-System 2).
const toneClass = { warn: "bg-apricot-50 text-apricot-700", neutral: "bg-line-soft text-ink" } as const;

export type TicketChipTone = keyof typeof toneClass;

export function TicketChip({ tone, icon, title, children }: { tone: TicketChipTone; icon: IconName; title?: string; children: ReactNode }) {
  return (
    <span title={title} className={`inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-[7px] px-[9px] py-0.5 text-xs font-medium ${toneClass[tone]}`}>
      <Icon name={icon} className="size-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}
