import Image from "next/image";
import Link from "next/link";

/**
 * Uses the cropped wordmark (1105x262, ratio 4.22:1) — NOT yufora1200.png,
 * which is 79% transparent padding and renders tiny at any given height.
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={["inline-flex items-center", className].filter(Boolean).join(" ")}
      aria-label="Yufora — home"
    >
      <Image
        src="/yufora-wordmark.png"
        alt="Yufora"
        width={1105}
        height={262}
        priority
        className="h-7 w-auto sm:h-8"
      />
    </Link>
  );
}
