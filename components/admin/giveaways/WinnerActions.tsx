"use client";

import { useKeepValuesSubmit } from "@/components/forms/useKeepValuesSubmit";
import { useActionState, useState, useTransition } from "react";
import {
  markDelivered,
  passToAlternate,
  resendWinnerEmail,
  type GiveawayFormState,
} from "@/app/actions/giveaways";
import { Button } from "@/components/ui/Button";

const initial: GiveawayFormState = { status: "idle" };

export function MarkDeliveredButton({ campaignId }: { campaignId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button type="button" disabled={pending} onClick={() => start(() => markDelivered(campaignId))}>
      {pending ? "Saving…" : "Mark prize delivered"}
    </Button>
  );
}

export function ResendWinnerEmailButton({ campaignId }: { campaignId: string }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await resendWinnerEmail(campaignId);
          setSent(true);
        })
      }
    >
      {pending ? "Sending…" : sent ? "Sent again" : "Resend winner email"}
    </Button>
  );
}

export function PassToAlternateForm({
  campaignId,
  nextRank,
  claimDays,
  status,
  deadlinePassed,
}: {
  campaignId: string;
  /** null when no alternates are left — passing on closes it as unclaimed. */
  nextRank: number | null;
  claimDays: number;
  status: string;
  deadlinePassed: boolean;
}) {
  const [state, formAction, pending] = useActionState(passToAlternate.bind(null, campaignId), initial);
  const keepValues = useKeepValuesSubmit(formAction);
  const [open, setOpen] = useState(false);
  const closed = status === "declined" || status === "expired" || status === "disqualified";

  if (!open) {
    return (
      <div>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          {nextRank ? "Pass to the next alternate…" : "Close as unclaimed…"}
        </Button>
        {state.message && (
          <p role={state.status === "error" ? "alert" : "status"} className="mt-2 text-sm text-warm-800">{state.message}</p>
        )}
      </div>
    );
  }
  return (
    <form action={formAction} onSubmit={keepValues} className="space-y-3 rounded-lg border border-warm-200 bg-warm-50 p-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-warm-900">Why?</legend>
        {closed ? (
          <label className="flex items-center gap-2 text-sm text-warm-800">
            <input type="radio" name="reason" value="declined" defaultChecked required />
            {status === "declined" ? "They declined the prize" : "Their claim is closed"}
          </label>
        ) : (
          <>
            {status === "notified" && (
              <label className={`flex items-center gap-2 text-sm ${deadlinePassed ? "text-warm-800" : "text-warm-500"}`}>
                <input type="radio" name="reason" value="expired" disabled={!deadlinePassed} required />
                They didn&rsquo;t accept by the deadline
                {!deadlinePassed && <span className="text-xs">(not yet — their window is still open)</span>}
              </label>
            )}
            <label className="flex items-center gap-2 text-sm text-warm-800">
              <input type="radio" name="reason" value="ineligible" required /> They aren&rsquo;t eligible
            </label>
            <label className="flex items-center gap-2 text-sm text-warm-800">
              <input type="radio" name="reason" value="unverified" required /> We couldn&rsquo;t verify their eligibility
            </label>
          </>
        )}
      </fieldset>
      <p className="text-sm text-warm-800">
        {nextRank
          ? `Pass the prize to alternate #${nextRank}? They'll be emailed and given ${claimDays} days to accept. This can't be undone.`
          : "No alternates are left, so this closes the giveaway with the prize unclaimed. This can't be undone."}
      </p>
      {state.status === "error" && state.message && <p role="alert" className="text-sm text-pink-700">{state.message}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Working…" : nextRank ? "Pass it on" : "Close as unclaimed"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
