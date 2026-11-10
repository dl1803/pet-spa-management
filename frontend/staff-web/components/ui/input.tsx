import type { ComponentProps } from "react";
import { Icon, type IconName } from "@/components/icons";

const controlClass =
  "w-full rounded-[10px] border border-line bg-white px-3 text-sm text-ink transition-colors tabular-nums " +
  "hover:border-[#B7CDD1] focus:border-lagoon focus:shadow-[0_0_0_3px_rgba(11,110,120,0.18)] focus:outline-none " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:hover:border-danger aria-[invalid=true]:focus:border-danger " +
  "aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgba(179,55,43,0.15)] " +
  "disabled:cursor-not-allowed disabled:bg-[#EEF3F4] disabled:text-[#8FA2A7]";

// Vùng chạm cao 44px cho web nhân viên (mục 6.1).
const inputClass = `h-11 ${controlClass}`;
// Ô nhiều dòng: cao tối thiểu 84px, kéo giãn theo chiều dọc.
const textareaClass = `min-h-[84px] resize-y py-2.5 leading-5 ${controlClass}`;

type InputProps = Omit<ComponentProps<"input">, "className"> & {
  prefixIcon?: IconName;
  // Đơn vị hiển thị cuối ô (“kg”, “cm”). Trang trí; nhãn ô phải nêu đơn vị.
  suffix?: string;
};

export function Input({ prefixIcon, suffix, ...rest }: InputProps) {
  const className = [inputClass, prefixIcon ? "pl-[38px]" : "", suffix ? "pr-11" : ""].filter(Boolean).join(" ");
  const input = <input className={className} {...rest} />;
  if (!prefixIcon && !suffix) return input;

  return (
    <div className="relative">
      {prefixIcon && (
        <Icon name={prefixIcon} className="pointer-events-none absolute left-3 top-[13px] size-[18px] text-muted" />
      )}
      {input}
      {suffix && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted"
        >
          {suffix}
        </span>
      )}
    </div>
  );
}

export function Textarea(props: Omit<ComponentProps<"textarea">, "className">) {
  return <textarea className={textareaClass} {...props} />;
}
