"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

/** Keeps an unexpected admin failure from becoming a bare error page. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  console.error("[admin] render failed", error);
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-warm-200 bg-white p-8">
      <h1 className="text-2xl">Something went wrong.</h1>
      <p className="mt-2 text-warm-700">
        That&rsquo;s on us, not you. Try again — if it keeps happening,
        email{" "}
        <a
          href="mailto:hello@yufora.com"
          className="text-pink-700 hover:underline"
        >
          hello@yufora.com
        </a>{" "}
        and we&rsquo;ll sort it out.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center px-2 text-warm-700 hover:text-pink-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
