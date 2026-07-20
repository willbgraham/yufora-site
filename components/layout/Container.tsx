import type { ComponentProps } from "react";

export default function Container({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={["mx-auto w-full max-w-6xl px-5 sm:px-8", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
