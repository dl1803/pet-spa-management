import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type AlertTone = "info" | "danger";

type AlertProps = {
  tone: AlertTone;
  /** Biểu tượng đầu dòng; mặc định theo tone. */
  icon?: IconName;
  title?: string;
  children: ReactNode;
  className?: string;
};

// Viền chưa có token nên viết thẳng tương tự ErrorAlert.
const TONE_STYLE: Record<AlertTone, { box: string; icon: string; defaultIcon: IconName }> = {
  info: { box: "border-[#C7DAF1] bg-info-50", icon: "text-info", defaultIcon: "info" },
  danger: { box: "border-[#EFC3BE] bg-danger-50", icon: "text-danger", defaultIcon: "x-circle" },
};

export function Alert({ tone, icon, title, children, className = "" }: AlertProps) {
  const style = TONE_STYLE[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
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

