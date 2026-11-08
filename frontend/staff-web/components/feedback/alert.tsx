import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type AlertTone = "warn" | "neutral" | "success" | "danger";

type AlertProps = {
  tone: AlertTone;
  icon?: IconName;
  title?: string;
  children: ReactNode;
  className?: string;
};

const TONE_STYLE: Record<AlertTone, { box: string; icon: string; iconName: IconName }> = {
  warn: { box: "border-[#F1D9A2] bg-[#FFF6E3]", icon: "text-[#B87400]", iconName: "alert" },
  neutral: { box: "border-line bg-mist", icon: "text-muted", iconName: "note" },
  success: { box: "border-[#BFE0CA] bg-success-50", icon: "text-success", iconName: "check-circle" },
  danger: { box: "border-[#EFC3BE] bg-danger-50", icon: "text-danger", iconName: "x-circle" },
};

export function Alert({ tone, icon, title, children, className = "" }: AlertProps) {
  const style = TONE_STYLE[tone];
  const iconName = icon ?? style.iconName;

  return (
    <div
      data-tone={tone}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 leading-5 ${style.box} ${className}`}
    >
      <Icon name={iconName} className={`mt-px size-[18px] ${style.icon}`} />
      <div className="min-w-0 break-words">
        {title && <div className="font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  );
}
