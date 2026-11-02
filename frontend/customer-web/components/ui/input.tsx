import type { ComponentProps } from "react";
import { Icon, type IconName } from "@/components/icons";

const inputClass =
  "h-[42px] w-full rounded-[10px] border border-line bg-white px-3 text-sm text-ink transition-colors " +
  "hover:border-[#B7CDD1] focus:border-lagoon focus:shadow-[0_0_0_3px_rgba(11,110,120,0.18)] focus:outline-none " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:hover:border-danger aria-[invalid=true]:focus:border-danger " +
  "aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgba(179,55,43,0.15)] " +
  "disabled:cursor-not-allowed disabled:bg-[#EEF3F4] disabled:text-[#8FA2A7]";

type InputProps = Omit<ComponentProps<"input">, "className"> & { prefixIcon?: IconName };

export function Input({ prefixIcon, ...rest }: InputProps) {
  const input = <input className={`${inputClass} ${prefixIcon ? "pl-[38px]" : ""}`} {...rest} />;
  if (!prefixIcon) return input;

  return (
    <div className="relative">
      <Icon name={prefixIcon} className="pointer-events-none absolute left-3 top-3 size-[18px] text-muted" />
      {input}
    </div>
  );
}

