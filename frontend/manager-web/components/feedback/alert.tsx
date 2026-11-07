import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type AlertProps = {
  title?: string;
  children: ReactNode;
  className?: string;
} & (
  // danger có biểu tượng mặc định; info, warn phải chọn biểu tượng theo ngữ cảnh.
  | { tone: "danger"; icon?: IconName }
  | { tone: "info" | "warn"; icon: IconName }
);

// Viền, nền của info và warn chưa có token nên viết thẳng theo .alert-info, .alert-warn của UI demo (Conventions mục 9).
const TONE_STYLE = {
  danger: { box: "border-[#EFC3BE] bg-danger-50", icon: "text-danger" },
  info: { box: "border-[#C7DAF1] bg-info-50", icon: "text-info" },
  warn: { box: "border-[#F1D9A2] bg-[#FFF6E3]", icon: "text-[#B87400]" },
} as const;

// Cảnh báo nghiệp vụ nội tuyến (Design-System 4.2). Chỉ danger là lỗi cần đọc ngay nên mới có role="alert".
export function Alert({ tone, icon, title, children, className = "" }: AlertProps) {
  const style = TONE_STYLE[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      data-tone={tone}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 leading-5 ${style.box} ${className}`}
    >
      <Icon name={icon ?? "x-circle"} className={`mt-px size-[18px] ${style.icon}`} />
      <div className="min-w-0 break-words">
        {title && <div className="font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  );
}
