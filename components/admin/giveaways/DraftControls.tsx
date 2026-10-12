"use client";

import { useKeepValuesSubmit } from "@/components/forms/useKeepValuesSubmit";
import { useActionState, useState, useTransition } from "react";
import {
  cancelGiveawayAction,
  deleteGiveaway,
  type GiveawayFormState,
} from "@/app/actions/giveaways";
import { Button } from "@/components/ui/Button";

const initial: GiveawayFormState = { status: "idle" };

export function DeleteDraftButton({ campaignId }: { campaignId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this draft giveaway? This can't be undone.")) {
          start(() => deleteGiveaway(campaignId));
        }
      }}
      className="rounded-md px-3 py-2 text-sm text-warm-600 hover:bg-warm-100 hover:text-pink-700"
    >
      {pending ? "Deleting…" : "Delete draft"}
    </button>
  );
}

export function CancelGiveawayForm({ campaignId }: { campaignId: string }) {
  const [state, formAction, pending] = useActionState(cancelGiveawayAction.bind(null, campaignId), initial);
  const keepValues = useKeepValuesSubmit(formAction);
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-warm-600 hover:text-pink-700">
        Cancel this giveaway…
      </button>
    );
  }
  return (
    <form action={formAction} onSubmit={keepValues} className="space-y-3 rounded-lg border border-warm-200 bg-warm-50 p-4">
      <p className="text-sm text-warm-800">
        You can cancel before entries open, or while nobody has entered. After that,
        canceling is a Rules question — email hello@yufora.com.
      </p>
      <label htmlFor="cancel-reason" className="block text-sm font-medium text-warm-900">Reason</label>
      <input id="cancel-reason" name="reason" required className="w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-base" />
      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className="text-sm text-warm-800">{state.message}</p>
      )}
      <div className="flex gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Canceling…" : "Cancel giveaway"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Keep it</Button>
      </div>
    </form>
  );
}
