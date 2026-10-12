"use client";

import { useKeepValuesSubmit } from "@/components/forms/useKeepValuesSubmit";
import { useActionState, useState } from "react";
import { respondToGiveawayClaim, type TokenActionState } from "@/app/actions/giveaway-entry";
import { Button } from "@/components/ui/Button";

const initial: TokenActionState = { status: "idle" };

const fieldBase =
  "mt-1.5 w-full rounded-md border border-warm-300 bg-white px-3.5 py-2.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600";

export default function ClaimForm({
  token,
  path,
  attestation,
}: {
  token: string;
  path: string;
  attestation: string;
}) {
  const [state, formAction, pending] = useActionState(respondToGiveawayClaim, initial);
  const keepValues = useKeepValuesSubmit(formAction);
  const [declining, setDeclining] = useState(false);

  return (
    <div className="space-y-6">
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-md border border-pink-200 bg-pink-50 p-3 text-sm text-pink-800">
          {state.message}
        </p>
      )}

      {!declining ? (
        <form action={formAction} onSubmit={keepValues} className="space-y-4">
          <input type="hidden" name="t" value={token} />
          <input type="hidden" name="path" value={path} />
          <input type="hidden" name="decision" value="accept" />
          <div>
            <label htmlFor="claim-email" className="block text-sm font-medium text-warm-900">
              Your email address
            </label>
            <input id="claim-email" name="email" type="email" autoComplete="email" required className={fieldBase} aria-describedby="claim-email-hint" />
            <p id="claim-email-hint" className="mt-1.5 text-sm text-warm-600">
              The one this prize was sent to — so a forwarded link can&rsquo;t claim it.
            </p>
          </div>
          <div>
            <label htmlFor="claim-name" className="block text-sm font-medium text-warm-900">
              Full legal name
            </label>
            <input id="claim-name" name="legalName" autoComplete="name" required className={fieldBase} aria-describedby="claim-name-hint" />
            <p id="claim-name-hint" className="mt-1.5 text-sm text-warm-600">As it appears on your ID.</p>
          </div>
          <div>
            <label htmlFor="claim-phone" className="block text-sm font-medium text-warm-900">
              Phone <span className="font-normal text-warm-600">(optional)</span>
            </label>
            <input id="claim-phone" name="phone" type="tel" autoComplete="tel" className={fieldBase} />
          </div>
          <label className="flex items-start gap-3 text-sm text-warm-800">
            <input type="checkbox" name="attest" required className="mt-0.5 size-5 shrink-0 accent-pink-600" />
            <span>{attestation}</span>
          </label>
          <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
            {pending ? "One moment…" : "Accept the prize"}
          </Button>
          <p>
            <button type="button" onClick={() => setDeclining(true)} className="text-sm text-warm-600 underline hover:text-pink-700">
              I don&rsquo;t want the prize
            </button>
          </p>
        </form>
      ) : (
        <form action={formAction} onSubmit={keepValues} className="space-y-4 rounded-lg border border-warm-200 p-5">
          <input type="hidden" name="t" value={token} />
          <input type="hidden" name="path" value={path} />
          <input type="hidden" name="decision" value="decline" />
          <p className="text-warm-800">
            Decline the prize? It will go to the next person drawn. This can&rsquo;t be undone.
          </p>
          <div>
            <label htmlFor="decline-email" className="block text-sm font-medium text-warm-900">
              Your email address
            </label>
            <input id="decline-email" name="email" type="email" autoComplete="email" required className={fieldBase} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? "One moment…" : "Yes, decline the prize"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDeclining(false)}>
              Keep it
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
