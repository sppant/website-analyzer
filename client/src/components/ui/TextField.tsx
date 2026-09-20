import { useId } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "../../utils/cn";

export const inputClasses =
  "w-full h-12 px-[18px] rounded-xl border-0 outline-none bg-[#090e0b] text-white text-[15px] placeholder:text-[#536058] focus:shadow-[inset_0_0_0_1px_rgba(66,245,141,0.35),0_0_0_3px_rgba(66,245,141,0.06)]";

/** Bare input, styled to match the site's form fields, without a label. */
export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClasses, className)} {...props} />;
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Helper text shown below the input (hidden once `error` is set). */
  hint?: string;
  error?: string;
};

/**
 * Label + input, matching the `.field` pattern repeated across the auth
 * pages (login/signup, forgot password, reset password). One `id` is
 * generated so `label` and `input` stay associated without the caller having
 * to invent one.
 */
export function TextField({ label, hint, error, id, className, ...props }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className="mb-4">
      <label
        htmlFor={fieldId}
        // Explicit `!` (important) resets, not just additions: this can
        // render inside a plain <form>, whose base App.css rule visually
        // hides labels (absolute position + 1px clip box) for the one form
        // that wants that. App.css is unlayered, plain CSS — it beats any
        // Tailwind utility (Tailwind wraps everything in `@layer`, and
        // unlayered rules always win the cascade over layered ones,
        // regardless of specificity) unless the utility is `!important`.
        className="static! mt-0! mr-0! mb-1.5! ml-0! h-auto! w-auto! overflow-visible! border-0! p-0! [clip:auto]! block text-xs font-bold whitespace-normal! text-[var(--muted)]"
      >
        {label}
      </label>
      <Input id={fieldId} className={className} {...props} />
      {error ? (
        <span className="mt-2 ml-0.5 block text-xs text-[var(--red)]">{error}</span>
      ) : hint ? (
        <span className="mt-2 ml-0.5 block text-xs text-[var(--muted-dark)]">{hint}</span>
      ) : null}
    </div>
  );
}

export default TextField;
