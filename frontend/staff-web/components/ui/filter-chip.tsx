import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type FilterChipProps = {
  active: boolean;
  onClick: () => void;
  icon?: IconName;
  count?: number;
  children: ReactNode;
};

export function FilterChip({ active, onClick, icon, count, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-[34px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium ${
        active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-[#A9C6CB]"
      }`}
    >
      {icon && <Icon name={icon} className="size-3.5" />}
      {children}
      {count !== undefined && (
        <span className={`text-xs font-semibold tabular-nums ${active ? "text-[#A9C4C9]" : "text-muted"}`}>{count}</span>
      )}
    </button>
  );
}

