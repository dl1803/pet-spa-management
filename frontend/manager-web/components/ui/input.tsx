import type { ComponentProps } from "react";
import { Icon } from "@/components/icons";

const controlClass =
  "block min-h-[42px] w-full rounded-[10px] border border-line bg-white px-3 tabular-nums text-ink placeholder:text-muted focus:border-lagoon focus:outline-none focus:ring-3 focus:ring-lagoon/20 aria-[invalid=true]:border-danger read-only:bg-mist disabled:bg-line-soft";

type InputProps = Omit<ComponentProps<"input">, "className"> & {
  // Đơn vị hiển thị cuối ô: “đ”, “phút”. Trang trí; nhãn ô phải nêu đơn vị.
  suffix?: string;
};

// Tương thích `register` của React Hook Form (React 19 nhận `ref` như prop).
export function Input({ suffix, ...rest }: InputProps) {
  if (!suffix) return <input className={controlClass} {...rest} />;
  return (
    <div className="relative">
      <input className={`${controlClass} pr-14`} {...rest} />
      <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
        {suffix}
      </span>
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
