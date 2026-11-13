import type { ComponentProps } from "react";
import { Icon, type IconName } from "@/components/icons";

const controlClass =
  "block min-h-[42px] w-full rounded-[10px] border border-line bg-white px-3 tabular-nums text-ink placeholder:text-muted focus:border-lagoon focus:outline-none focus:ring-3 focus:ring-lagoon/20 aria-[invalid=true]:border-danger read-only:bg-mist disabled:bg-line-soft";

type InputProps = Omit<ComponentProps<"input">, "className"> & {
  // Biểu tượng trang trí đầu ô (màn đăng nhập: điện thoại, khóa).
  prefixIcon?: IconName;
  // Đơn vị hiển thị cuối ô: “đ”, “phút”. Trang trí; nhãn ô phải nêu đơn vị.
  suffix?: string;
};

// Tương thích `register` của React Hook Form (React 19 nhận `ref` như prop).
export function Input({ prefixIcon, suffix, ...rest }: InputProps) {
  if (!prefixIcon && !suffix) return <input className={controlClass} {...rest} />;
  const className = [controlClass, prefixIcon ? "pl-[38px]" : "", suffix ? "pr-14" : ""].filter(Boolean).join(" ");
  return (
    <div className="relative">
      {prefixIcon && (
        <Icon name={prefixIcon} className="pointer-events-none absolute left-3 top-3 size-[18px] text-muted" />
      )}
      <input className={className} {...rest} />
      {suffix && (
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function Textarea(props: Omit<ComponentProps<"textarea">, "className">) {
  return <textarea className={`${controlClass} min-h-16 resize-y py-2.5`} {...props} />;
}

export function Select({ children, ...rest }: Omit<ComponentProps<"select">, "className">) {
  return (
    <div className="relative">
      <select className={`${controlClass} cursor-pointer appearance-none pr-9`} {...rest}>
        {children}
      </select>
      <Icon name="chev-d" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}
