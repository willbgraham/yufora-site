"use client";

import { useActionState, useEffect, useState } from "react";
import { startCheckout, type CheckoutState } from "@/app/actions/checkout";
import { Button } from "@/components/ui/Button";
import { formatCents } from "@/lib/money";

const initial: CheckoutState = { status: "idle" };

export default function FundButtons({
  productId,
  remainingCents,
  context = "hosted",
}: {
  productId: string;
  remainingCents: number;
  /** Where the donor is giving from — decides where Stripe returns them. */
  context?: "hosted" | "embed";
}) {
  const [state, formAction, pending] = useActionState(startCheckout, initial);
  const [chipOpen, setChipOpen] = useState(false);
  const [amount, setAmount] = useState("");

  // Navigate the TOP window to Stripe: inside the embed iframe this breaks
  // out (Checkout won't render in a frame); standalone, top === self.
  useEffect(() => {
    if (state.status === "redirect") {
      (window.top ?? window).location.href = state.url;
    }
  }, [state]);

  const quickAmounts = [2500, 5000, 10000].filter((a) => a < remainingCents);

  return (
    <div className="space-y-3">
      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="rounded-md border border-pink-200 bg-pink-50 p-3 text-sm text-pink-800"
        >
          {state.message}
        </p>
      )}

      <form action={formAction}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="mode" value="full" />
        <input type="hidden" name="context" value={context} />
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "One moment…" : `Fund this — ${formatCents(remainingCents)}`}
        </Button>
      </form>

      {quickAmounts.length > 0 &&
        (chipOpen ? (
          <form
            action={formAction}
            className="rounded-lg border border-warm-200 p-4"
          >
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="mode" value="custom" />
            <input type="hidden" name="context" value={context} />
            <p className="text-sm font-medium text-warm-900">
              Chip in toward it
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {quickAmounts.map((cents) => (
                <button
                  key={cents}
                  type="button"
                  onClick={() => setAmount((cents / 100).toString())}
                  aria-pressed={amount === (cents / 100).toString()}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    amount === (cents / 100).toString()
                      ? "border-pink-600 bg-pink-50 text-pink-700"
                      : "border-warm-300 text-warm-700 hover:border-pink-400"
                  }`}
                >
                  {formatCents(cents)}
                </button>
              ))}
            </div>
            <div className="relative mt-3">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-warm-500"
              >
                $
              </span>
              <label htmlFor="chip-amount" className="sr-only">
                Amount in dollars
              </label>
              <input
                id="chip-amount"
                name="amount"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Any amount, $5 or more"
                className="w-full rounded-md border border-warm-300 bg-white py-2.5 pl-8 pr-3.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={pending}
              className="mt-3 w-full"
            >
              {pending ? "One moment…" : "Give this amount"}
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => setChipOpen(true)}
          >
            Chip in
          </Button>
        ))}

      <p className="text-center text-sm text-warm-500">
        Secure checkout by Stripe. You&rsquo;ll get a receipt by email.
      </p>
    </div>
  );
}
