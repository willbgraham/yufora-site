"use client";

import { useKeepValuesSubmit } from "@/components/forms/useKeepValuesSubmit";
import { useActionState, useEffect, useRef } from "react";
import { createGiveaway, type GiveawayFormState } from "@/app/actions/giveaways";
import { Button } from "@/components/ui/Button";
import { US_TIMEZONES } from "@/lib/giveaways/constants";

const initial: GiveawayFormState = { status: "idle" };

const fieldBase =
  "mt-1.5 w-full rounded-md border border-warm-300 bg-white px-3.5 py-2.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600";

export default function NewGiveawayForm() {
  const [state, formAction, pending] = useActionState(createGiveaway, initial);
  const keepValues = useKeepValuesSubmit(formAction);
  const tzRef = useRef<HTMLSelectElement>(null);
  const errs = state.fieldErrors ?? {};

  // Default to the browser's zone when it's one we support.
  useEffect(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tzRef.current && US_TIMEZONES.some((z) => z.value === local)) {
      tzRef.current.value = local;
    }
  }, []);

  return (
    <form action={formAction} onSubmit={keepValues} className="space-y-5">
      {state.status === "error" && state.message && (
        <div role="alert" className="rounded-md border border-pink-200 bg-pink-50 p-4 text-sm text-pink-800">
          {state.message}
        </div>
      )}
      <div>
        <label htmlFor="prizeName" className="block text-sm font-medium text-warm-900">
          Prize
        </label>
        <input
          id="prizeName"
          name="prizeName"
          required
          placeholder="e.g. Two nights at Lakeview Cabins"
          aria-invalid={!!errs.prizeName}
          aria-describedby={errs.prizeName ? "prizeName-error" : undefined}
          className={fieldBase}
        />
        {errs.prizeName && <p id="prizeName-error" className="mt-1.5 text-sm text-pink-700">{errs.prizeName}</p>}
      </div>
      <div>
        <label htmlFor="prizeArv" className="block text-sm font-medium text-warm-900">
          Prize value (USD)
        </label>
        <div className="relative mt-1.5">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-warm-500">
            $
          </span>
          <input
            id="prizeArv"
            name="prizeArv"
            required
            inputMode="decimal"
            placeholder="450"
            aria-invalid={!!errs.prizeArv}
            aria-describedby={errs.prizeArv ? "prizeArv-error" : "prizeArv-hint"}
            className="w-full rounded-md border border-warm-300 bg-white py-2.5 pl-8 pr-3.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600"
          />
        </div>
        {errs.prizeArv ? (
          <p id="prizeArv-error" className="mt-1.5 text-sm text-pink-700">{errs.prizeArv}</p>
        ) : (
          <p id="prizeArv-hint" className="mt-1.5 text-sm text-warm-600">
            What it would cost to buy. Must be under $5,000.
          </p>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-warm-900">
            Last day to enter
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            aria-invalid={!!errs.endDate}
            aria-describedby={errs.endDate ? "endDate-error" : undefined}
            className={fieldBase}
          />
          {errs.endDate && <p id="endDate-error" className="mt-1.5 text-sm text-pink-700">{errs.endDate}</p>}
        </div>
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-warm-900">
            Time zone
          </label>
          <select ref={tzRef} id="timezone" name="timezone" defaultValue="America/New_York" className={fieldBase}>
            {US_TIMEZONES.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Create giveaway"}
      </Button>
    </form>
  );
}
