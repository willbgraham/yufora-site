"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { CheckoutState } from "@/app/actions/checkout";
import { startGiveawayDonation } from "@/app/actions/giveaway-entry";
import { useKeepValuesSubmit } from "@/components/forms/useKeepValuesSubmit";
import NoDonationNecessary from "@/components/giveaways/NoDonationNecessary";
import { Button } from "@/components/ui/Button";
import { donationGrant } from "@/lib/giveaways/entries";
import { money } from "@/lib/giveaways/format";

const initial: CheckoutState = { status: "idle" };

/**
 * Bonus entries with a donation. Draws the "no donation necessary" line
 * itself, so no page can render a donate button without it.
 */
export default function BonusEntryForm({
  token,
  centsPerEntry,
  perPersonCap,
  currentActive,
}: {
  token: string;
  centsPerEntry: number;
  perPersonCap: number;
  currentActive: number;
}) {
  const [state, formAction, pending] = useActionState(startGiveawayDonation, initial);
  const keepValues = useKeepValuesSubmit(formAction);
  const remaining = Math.max(0, perPersonCap - currentActive);
  const chips = useMemo(
    () =>
      [1, 3, 5, 10]
        .filter((n) => n <= remaining)
        .map((n) => ({ entries: n, cents: n * centsPerEntry })),
    [remaining, centsPerEntry],
  );
  const [amount, setAmount] = useState(chips[0] ? String(chips[0].cents / 100) : "");

  // Stripe Checkout won't render in a frame — navigate the top window.
  useEffect(() => {
    if (state.status === "redirect") (window.top ?? window).location.href = state.url;
  }, [state]);

  const cents = Math.round(parseFloat(amount.replace(/[$,\s]/g, "")) * 100);
  const adds = Number.isFinite(cents)
    ? donationGrant({ amountCents: cents, centsPerEntry, perPersonCap, currentActive })
    : 0;
  const capCents = remaining * centsPerEntry;

  return (
    <form action={formAction} onSubmit={keepValues} className="flex flex-1 flex-col gap-3">
      <input type="hidden" name="t" value={token} />
      <p>1 bonus entry for every {money(centsPerEntry)} you give.</p>
      {chips.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {chips.map((c) => {
            const v = String(c.cents / 100);
            return (
              <button
                key={c.entries}
                type="button"
                onClick={() => setAmount(v)}
                aria-pressed={amount === v}
                className={`min-h-11 rounded-md border px-3 py-2 text-sm font-medium ${
                  amount === v
                    ? "border-pink-600 bg-pink-50 text-pink-700"
                    : "border-warm-300 text-warm-700 hover:border-pink-400"
                }`}
              >
                {money(c.cents)} · {c.entries} {c.entries === 1 ? "entry" : "entries"}
              </button>
            );
          })}
        </div>
      )}
      <div>
        <label htmlFor="bonus-amount" className="block text-sm font-medium text-warm-900">
          Or another amount
        </label>
        <div className="relative mt-1.5">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-warm-500">
            $
          </span>
          <input
            id="bonus-amount"
            name="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-describedby="bonus-amount-hint"
            className="w-full rounded-md border border-warm-300 bg-white py-2.5 pl-8 pr-3.5 text-base text-warm-900 focus:border-pink-600"
          />
        </div>
        <p id="bonus-amount-hint" className="mt-1.5 text-sm text-warm-600" aria-live="polite">
          {adds > 0
            ? `Adds ${adds} bonus ${adds === 1 ? "entry" : "entries"}. Gifts above ${money(capCents)} won't add more.`
            : `Gifts count in ${money(centsPerEntry)} steps.`}
        </p>
      </div>
      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-pink-700">{state.message}</p>
      )}
      <div className="mt-auto space-y-2">
        <Button type="submit" size="lg" className="w-full" disabled={pending || adds === 0}>
          {pending ? "One moment…" : "Donate for bonus entries"}
        </Button>
        <NoDonationNecessary />
      </div>
    </form>
  );
}
