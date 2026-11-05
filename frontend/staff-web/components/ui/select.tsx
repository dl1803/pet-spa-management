import type { ComponentProps } from "react";
import { Icon } from "@/components/icons";

// Ô chọn dạng danh sách thả. Web nhân viên: cao tối thiểu 44px (Design-System 3).
const selectClass =
  "block min-h-11 w-full cursor-pointer appearance-none rounded-[10px] border border-line bg-white pl-3 pr-9 text-ink tabular-nums focus:border-lagoon focus:outline-none focus:ring-3 focus:ring-lagoon/20 disabled:cursor-not-allowed disabled:bg-line-soft";

export function Select({ children, ...rest }: Omit<ComponentProps<"select">, "className">) {
  return (
    <div className="relative">
      <select className={selectClass} {...rest}>
        {children}
      </select>
      <Icon name="chev-d" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}
