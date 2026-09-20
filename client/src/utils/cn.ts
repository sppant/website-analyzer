/** Joins class names, dropping falsy values. No conflict resolution — keep
 * variant class lists mutually exclusive at the call site instead of pulling
 * in tailwind-merge for this small a component set. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
