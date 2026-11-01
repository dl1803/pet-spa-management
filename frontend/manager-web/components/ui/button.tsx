import type { ButtonHTMLAttributes } from "react";

type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger-solid";
  size?: "sm" | "md" | "lg";
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

const baseClass =
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-semibold leading-none transition-colors disabled:cursor-not-allowed disabled:border-line-soft disabled:bg-line-soft disabled:text-muted max-[640px]:whitespace-normal max-[640px]:text-center max-[640px]:leading-[18px]";

const variantClass = {
  primary: "border-transparent bg-lagoon text-white enabled:hover:bg-lagoon-700",
  secondary: "border-lagoon bg-white text-lagoon-700 enabled:hover:bg-lagoon-25",
  ghost: "border-transparent bg-transparent text-ink enabled:hover:bg-line-soft",
  // Nút xác nhận trong hộp thoại nguy hiểm (Design-System 4.1).
  "danger-solid": "border-transparent bg-danger text-white enabled:hover:bg-danger/90",
} as const;

const sizeClass = {
  sm: "min-h-[34px] px-3 text-[13px]",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-[22px] text-[15px]",
} as const;

export function Button({ variant = "primary", size = "md", type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={`${baseClass} ${variantClass[variant]} ${sizeClass[size]}`} {...rest} />;
}
