"use client";

import { Button } from "@/components/ui/Button";

/**
 * Root error boundary. Catches failures anywhere below the root layout —
 * including errors thrown inside nested layouts, which segment-level
 * error.tsx files (like app/admin/error.tsx) can't see. Without this,
 * a layout failure renders Next's bare "Application error" digest page.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[root] render failed", error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-warm-200 bg-white p-8 text-center">
        <p className="font-display text-2xl text-warm-900">
          Something went wrong.
        </p>
        <p className="mt-2 text-warm-700">
          That&rsquo;s on us. Try again — and if it keeps happening, email{" "}
          <a
            href="mailto:hello@yufora.com"
            className="text-pink-700 hover:underline"
          >
            hello@yufora.com
          </a>
          {error.digest && (
            <span className="mt-2 block text-xs text-warm-500">
              Reference: {error.digest}
            </span>
          )}
        </p>
        <Button type="button" onClick={reset} className="mt-6">
          Try again
        </Button>
      </div>
    </div>
  );
}
