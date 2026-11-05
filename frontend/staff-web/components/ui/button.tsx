import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type ButtonStyleProps = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
};

// Web nhân viên: vùng chạm tối thiểu 44px, nút nhỏ 36px (Design-System 3, 4.1).
const baseClass =
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-semibold leading-none transition-colors";

const variantClass = {
  primary: "border-transparent bg-lagoon text-white hover:bg-lagoon-700",
  secondary: "border-lagoon bg-white text-lagoon-700 hover:bg-lagoon-25",
  ghost: "border-transparent bg-transparent text-ink hover:bg-line-soft",
} as const;

const sizeClass = {
  sm: "min-h-9 px-3 text-[13px]",
  md: "min-h-11 px-4 text-sm",
} as const;

function buttonClass({ variant = "primary", size = "md" }: ButtonStyleProps) {
  return `${baseClass} ${variantClass[variant]} ${sizeClass[size]}`;
}

type ButtonProps = ButtonStyleProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

export function Button({ variant, size, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass({ variant, size })} {...rest} />;
}

type ButtonLinkProps = ButtonStyleProps & Omit<ComponentProps<typeof Link>, "className">;

export function ButtonLink({ variant, size, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass({ variant, size })} {...rest} />;
}
