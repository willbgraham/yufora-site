"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { drawGiveaway, type DrawActionState } from "@/app/actions/giveaways";
import { Button } from "@/components/ui/Button";

const initial: DrawActionState = { status: "idle" };

/**
 * The one irreversible button. Locks the pool, fixes a future drand round,
 * waits for it and finishes. A retry after any failure resumes the same
 * draw — the round was fixed at lock, so the result can't change.
 */
export default function DrawPanel({
  campaignId,
  canDraw,
  drawing,
  summary,
}: {
  campaignId: string;
  canDraw: boolean;
  drawing: boolean;
  summary: React.ReactNode;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(drawGiveaway.bind(null, campaignId), initial);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const waiting = drawing || state.status === "waiting";

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  // While the deciding round is pending, refresh until the page flips to drawn.
  useEffect(() => {
    if (!waiting || pending) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [waiting, pending, router]);

  return (
    <section aria-labelledby="draw-heading" className="rounded-xl border border-pink-200 bg-white p-6">
      <h2 id="draw-heading" className="text-xl">Draw the winner</h2>
      <div className="mt-2 text-warm-700">{summary}</div>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-warm-700">
        <li>We lock the entry list and publish its fingerprint.</li>
        <li>We take the next public random number from drand — nobody, including us, knows it in advance.</li>
        <li>That number, combined with the secret sealed when you went live, picks the winner and three alternates. Anyone can check the result on your results page.</li>
      </ol>

      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className={`mt-4 text-sm ${state.status === "error" ? "text-pink-700" : "text-warm-800"}`}>
          {state.message}
        </p>
      )}

      <div className="mt-5">
        {waiting && !pending ? (
          <form action={formAction}>
            <input type="hidden" name="confirmFinal" value="on" />
            <p className="text-sm text-warm-800">
              Drawing… waiting for the public random number. This takes under a minute — you can leave this page.
            </p>
            <Button type="submit" variant="secondary" className="mt-3">
              Finish the draw
            </Button>
          </form>
        ) : !open ? (
          <Button type="button" size="lg" disabled={!canDraw || pending} onClick={() => setOpen(true)}>
            {pending ? "Drawing…" : "Lock entries & draw the winner"}
          </Button>
        ) : (
          <div ref={panelRef} tabIndex={-1} onKeyDown={(e) => e.key === "Escape" && setOpen(false)} className="rounded-lg border border-pink-200 bg-pink-50 p-4 outline-none">
            <form action={formAction} className="space-y-4">
              <label className="flex items-start gap-3 text-sm text-warm-900">
                <input type="checkbox" name="confirmFinal" required className="mt-0.5 size-5 shrink-0 accent-pink-600" />
                <span>I understand the draw is final. It can&rsquo;t be undone or re-run.</span>
              </label>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={pending}>
                  {pending ? "Drawing… (up to a minute)" : "Draw the winner now"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
