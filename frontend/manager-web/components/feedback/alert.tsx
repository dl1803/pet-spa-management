import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type AlertTone = "info" | "warn" | "neutral" | "success" | "danger";

type AlertProps = {
  tone: AlertTone;
  icon?: IconName;
  title?: string;
  children: ReactNode;
  className?: string;
  role?: "alert" | null;
};

// Các màu chưa có token lấy từ UI demo (Frontend-Conventions mục 9).
const TONE_STYLE: Record<AlertTone, { box: string; icon: string; defaultIcon: IconName }> = {
  info: { box: "border-[#C7DAF1] bg-info-50", icon: "text-info", defaultIcon: "info" },
  warn: { box: "border-[#F1D9A2] bg-[#FFF6E3]", icon: "text-[#B87400]", defaultIcon: "alert" },
  neutral: { box: "border-line bg-mist", icon: "text-muted", defaultIcon: "note" },
  success: { box: "border-[#BFE0CA] bg-success-50", icon: "text-success", defaultIcon: "check-circle" },
  danger: { box: "border-[#EFC3BE] bg-danger-50", icon: "text-danger", defaultIcon: "x-circle" },
};

export function Alert({
  tone,
  icon,
  title,
  children,
  className = "",
  role = tone === "danger" ? "alert" : undefined,
}: AlertProps) {
  const style = TONE_STYLE[tone];

  return (
    <div
      role={role ?? undefined}
      data-tone={tone}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 leading-5 ${style.box} ${className}`}
    >
      <Icon name={icon ?? style.defaultIcon} className={`mt-px size-[18px] ${style.icon}`} />
      <div className="min-w-0 break-words">
        {title && <div className="font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  );
}
