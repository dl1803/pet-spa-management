import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type ButtonStyleProps = {
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
  block?: boolean;
};

const baseClass =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-semibold leading-none transition-colors max-[640px]:whitespace-normal max-[640px]:text-center max-[640px]:leading-[18px]";

const variantClass = {
  primary: "border-transparent bg-lagoon text-white hover:bg-lagoon-700",
  secondary: "border-lagoon bg-white text-lagoon-700 hover:bg-lagoon-25",
};

const sizeClass = {
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-[22px] text-[15px]",
};

function buttonClass({ variant = "primary", size = "md", block = false }: ButtonStyleProps) {
  return `${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${block ? "w-full" : ""}`;
}

type ButtonProps = ButtonStyleProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

export function Button({ variant, size, block, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={`${buttonClass({ variant, size, block })} cursor-pointer`} {...rest} />;
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

