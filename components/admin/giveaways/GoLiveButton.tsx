"use client";

import { useKeepValuesSubmit } from "@/components/forms/useKeepValuesSubmit";
import { useActionState, useEffect, useRef, useState } from "react";
import { goLiveGiveaway, type GoLiveState } from "@/app/actions/giveaways";
import { Button } from "@/components/ui/Button";

const initial: GoLiveState = { status: "idle" };

export default function GoLiveButton({
  campaignId,
  ready,
  blockedReason,
  attestation,
  startsLater,
}: {
  campaignId: string;
  ready: boolean;
  blockedReason: string | null;
  attestation: string;
  startsLater: string | null;
}) {
  const [state, formAction, pending] = useActionState(goLiveGiveaway.bind(null, campaignId), initial);
  const keepValues = useKeepValuesSubmit(formAction);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <div>
        <Button type="button" size="lg" disabled={!ready} onClick={() => setOpen(true)}>
          Go live
        </Button>
        {blockedReason && <p className="mt-2 text-sm text-warm-600">{blockedReason}</p>}
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      className="rounded-lg border border-pink-200 bg-pink-50 p-5 outline-none"
    >
      <form action={formAction} onSubmit={keepValues} className="space-y-4">
        <p className="text-warm-900">
          Going live locks the prize, dates, entry settings and Sponsor details into
          your Official Rules. They can&rsquo;t be changed afterwards.
          {startsLater ? ` Entries open ${startsLater}.` : ""}
        </p>
        <label className="flex items-start gap-3 text-sm text-warm-800">
          <input type="checkbox" name="sponsorAttest" required className="mt-0.5 size-5 shrink-0 accent-pink-600" />
          <span>{attestation}</span>
        </label>
        {state.status === "error" && state.message && (
          <p role="alert" className="text-sm text-pink-700">{state.message}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Going live…" : "Go live now"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
