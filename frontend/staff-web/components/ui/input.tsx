import type { ComponentProps } from "react";

const inputClass =
  "h-11 w-full rounded-[10px] border border-line bg-white px-3 text-sm text-ink transition-colors tabular-nums " +
  "hover:border-[#B7CDD1] focus:border-lagoon focus:shadow-[0_0_0_3px_rgba(11,110,120,0.18)] focus:outline-none " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:hover:border-danger aria-[invalid=true]:focus:border-danger " +
  "aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgba(179,55,43,0.15)] " +
  "disabled:cursor-not-allowed disabled:bg-[#EEF3F4] disabled:text-[#8FA2A7]";

export function Input(props: Omit<ComponentProps<"input">, "className">) {
  return <input className={inputClass} {...props} />;
}
