import type { ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import type { LinkProps } from "react-router-dom";

import { cn } from "../../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "link";
export type ButtonSize = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-extrabold whitespace-nowrap transition-colors disabled:cursor-wait disabled:opacity-60";

const sizes: Record<ButtonSize, string> = {
  md: "h-11 px-[22px] text-sm",
  sm: "h-9 px-3 text-[11px]",
};

const variants: Record<ButtonVariant, string> = {
  // The site's one real primary CTA style — consolidates what used to be
  // three near-identical hand-written classes (.upgrade-button, .pricing-cta,
  // .cookie-accept).
  primary:
    "bg-accent text-ink shadow-[0_8px_24px_rgba(66,245,141,0.18)] hover:bg-accent-hover",
  secondary:
    "bg-[#131b16] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-hover)]",
  ghost: "bg-[#111914] text-[var(--muted)] hover:text-white",
  // Text-only, e.g. "Manage billing" inline actions (was .link-button).
  link: "h-auto! px-0! font-bold text-accent text-[13px] hover:underline",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, sizes[size], variants[variant], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/** Standard button — for actions (submit, click handlers). For navigation, use `LinkButton`. */
export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      {...props}
    />
  );
}

type LinkButtonProps = LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/** Same visual variants as `Button`, rendered as a router `<Link>` for navigation. */
export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

export default Button;
