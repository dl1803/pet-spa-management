import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

export function AuthAlert({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border border-[#EFC3BE] bg-danger-50 px-4 py-3.5 leading-5 ${className}`}
    >
      <Icon name="x-circle" className="mt-px size-[18px] text-danger" />
      <div>{children}</div>
    </div>
  );
}

