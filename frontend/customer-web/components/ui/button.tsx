import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type ButtonStyleProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger-solid";
  size?: "sm" | "md" | "lg";
  block?: boolean;
};

const baseClass =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-semibold leading-none transition-colors disabled:border-transparent disabled:bg-[#E5ECEE] disabled:text-[#869AA0] max-[640px]:whitespace-normal max-[640px]:text-center max-[640px]:leading-[18px]";

const variantClass = {
  primary: "border-transparent bg-lagoon text-white not-disabled:hover:bg-lagoon-700",
  secondary: "border-lagoon bg-white text-lagoon-700 not-disabled:hover:bg-lagoon-25",
  ghost: "border-transparent bg-transparent text-ink not-disabled:hover:bg-line-soft",
  // Nút xác nhận trong hộp thoại nguy hiểm.
  "danger-solid": "border-transparent bg-danger text-white not-disabled:hover:bg-danger/90",
};

const sizeClass = {
  sm: "min-h-[34px] px-3 text-[13px]",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-[22px] text-[15px]",
};

function buttonClass({ variant = "primary", size = "md", block = false }: ButtonStyleProps) {
  return `${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${block ? "w-full" : ""}`;
}

type ButtonProps = ButtonStyleProps & { loading?: boolean } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

export function Button({
  variant,
  size,
  block,
  type = "button",
  loading = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClass({ variant, size, block })} ${loading ? "cursor-wait" : "cursor-pointer disabled:cursor-not-allowed"}`}
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

export function LinkButton(props: Omit<ComponentProps<typeof Link>, "className">) {
  return (
    <Link className="inline-flex items-center gap-1.5 text-xs font-semibold text-lagoon hover:text-lagoon-700" {...props} />
  );
}
