import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Style-only. Deliberately has NO onClick prop — accepting one would force
 * "use client" here and drag every consumer client-side with it.
 */
type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  // pink-600, not pink-500 — white text needs 5.46:1, and pink-500 only gives 4.29:1
  primary: "bg-pink-600 text-white hover:bg-pink-700 active:bg-pink-800",
  secondary:
    "bg-white text-warm-900 ring-1 ring-warm-300 hover:bg-warm-50 hover:ring-warm-400",
  ghost: "text-pink-700 hover:bg-pink-50",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-5 py-2.5 text-base", // min-h-11 = 44px touch target
  lg: "min-h-13 px-7 py-3.5 text-lg",
};

function classes(variant: Variant, size: Size, className?: string) {
  return [base, variants[variant], sizes[size], className]
    .filter(Boolean)
    .join(" ");
}

type ButtonAsLink = { href: string; variant?: Variant; size?: Size } & Omit<
  ComponentProps<typeof Link>,
  "href"
>;

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonAsLink) {
  return (
    <Link href={href} className={classes(variant, size, className)} {...props} />
  );
}

type ButtonProps = { variant?: Variant; size?: Size } & ComponentProps<"button">;

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return <button className={classes(variant, size, className)} {...props} />;
}
