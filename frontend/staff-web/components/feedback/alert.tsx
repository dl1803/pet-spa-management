import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type AlertTone = "warn" | "neutral";

type AlertProps = {
  tone: AlertTone;
  icon: IconName;
  children: ReactNode;
  className?: string;
};

// Màu theo `.alert-warn`, `.alert-neutral` của UI demo; viền và nền cảnh báo chưa có token nên viết thẳng như `error-alert.tsx` (Conventions mục 9).
const TONE_STYLE: Record<AlertTone, { box: string; icon: string }> = {
  warn: { box: "border-[#F1D9A2] bg-[#FFF6E3]", icon: "text-[#B87400]" },
  neutral: { box: "border-line bg-mist", icon: "text-muted" },
};

// Cảnh báo nghiệp vụ nội tuyến (Design-System 4.2). Không dùng cho lỗi gọi API: dùng `ErrorAlert`.
export function Alert({ tone, icon, children, className = "" }: AlertProps) {
  const style = TONE_STYLE[tone];

  return (
    <div
      data-tone={tone}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 leading-5 ${style.box} ${className}`}
    >
      <Icon name={icon} className={`mt-px size-[18px] ${style.icon}`} />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
