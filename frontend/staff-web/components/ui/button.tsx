import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type ButtonStyleProps = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  block?: boolean;
};

const baseClass =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-semibold leading-none transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#E5ECEE] disabled:text-[#869AA0]";

const variantClass = {
  primary: "border-transparent bg-lagoon text-white not-disabled:hover:bg-lagoon-700",
  secondary: "border-lagoon bg-white text-lagoon-700 not-disabled:hover:bg-lagoon-25",
  ghost: "border-transparent bg-transparent text-ink not-disabled:hover:bg-line-soft",
} as const;

const sizeClass = {
  sm: "min-h-9 px-3 text-[13px]",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-[22px] text-[15px]",
} as const;

function buttonClass({
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
}: ButtonStyleProps & { loading?: boolean }) {
  const cursor = loading ? "cursor-wait" : "cursor-pointer";
  return `${baseClass} ${cursor} ${variantClass[variant]} ${sizeClass[size]}${block ? " w-full" : ""}`;
}

type ButtonProps = ButtonStyleProps & { loading?: boolean } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

export function Button({
  variant,
  size,
  block,
  type = "button",
  loading = false,
  disabled = false,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, block, loading })}
      {...rest}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current/40 border-t-current"
          />
          Đang gửi…
        </>
      ) : (
        children
      )}
    </button>
  );
}

type ButtonLinkProps = ButtonStyleProps & Omit<ComponentProps<typeof Link>, "className">;

export function ButtonLink({ variant, size, block, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass({ variant, size, block })} {...rest} />;
}
