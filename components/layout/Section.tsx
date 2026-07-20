import type { ComponentProps } from "react";
import Container from "./Container";

type Props = {
  /** Ties the <section> to its heading for screen readers. */
  labelledBy?: string;
  tone?: "white" | "tint" | "dark";
  bleed?: boolean;
} & ComponentProps<"section">;

const tones = {
  white: "bg-white",
  tint: "bg-warm-50",
  dark: "bg-warm-950 text-warm-200",
} as const;

export default function Section({
  labelledBy,
  tone = "white",
  bleed = false,
  className,
  children,
  ...props
}: Props) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={[
        tones[tone],
        "py-section lg:py-section-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {bleed ? children : <Container>{children}</Container>}
    </section>
  );
}
