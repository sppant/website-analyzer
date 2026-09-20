import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "../../utils/cn";

type CardProps<T extends ElementType> = {
  as?: T;
  /** Highlighted border + glow — the "featured" pricing card look. */
  featured?: boolean;
  /** Hover border/background shift — for cards that are also links. */
  interactive?: boolean;
  /** "md" (default) for content cards, "sm" for compact list items. */
  padding?: "md" | "sm";
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/**
 * Shared card shell (border, radius, background) behind what used to be two
 * separate hand-written classes, `.pricing-card` and `.project-card`. Content
 * layout stays with the caller — this only owns the outer container.
 */
export function Card<T extends ElementType = "div">({
  as,
  featured = false,
  interactive = false,
  padding = "md",
  className,
  children,
  ...props
}: CardProps<T>) {
  const Component = as ?? "div";

  return (
    <Component
      className={cn(
        "block rounded-2xl border border-[#26352d] bg-[rgba(12,18,15,0.9)] text-[var(--text)] no-underline",
        padding === "md" ? "p-7" : "p-[18px]",
        featured && "border-accent/35 shadow-[0_0_50px_rgba(66,245,141,0.06)]",
        interactive &&
          "transition-colors duration-200 hover:border-accent/35 hover:bg-[var(--surface-hover)]",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Card;
