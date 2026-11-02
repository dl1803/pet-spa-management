import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

// Cảnh báo nghiệp vụ nội tuyến (Design-System 4.2); hiện mới cần tone danger.
export function Alert({ tone, children, className = "" }: { tone: "danger"; children: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      data-tone={tone}
      className={`flex items-start gap-3 rounded-xl border border-[#EFC3BE] bg-danger-50 px-4 py-3.5 leading-5 ${className}`}
    >
      <Icon name="x-circle" className="mt-px size-[18px] text-danger" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
