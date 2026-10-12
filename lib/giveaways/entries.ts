import { DONATION_CUTOFF_MS } from "./constants";
import type { GiveawayPhase } from "./types";

/**
 * Entry grant math and the derived phase. Pure and isomorphic: the server
 * ledger enforces these under row locks; the UI imports donationGrant for
 * its "this adds N entries" preview.
 */

/** Free entries to add now: today's remaining allowance, within the cap. */
export function freeGrant(args: {
  freeEntriesPerDay: number;
  perPersonCap: number;
  currentActive: number;
  claimedToday: number;
}): number {
  return Math.max(
    0,
    Math.min(
      args.freeEntriesPerDay - args.claimedToday,
      args.perPersonCap - args.currentActive,
    ),
  );
}

/** Bonus entries a gift earns: whole multiples of the rate, within the cap. */
export function donationGrant(args: {
  amountCents: number;
  centsPerEntry: number;
  perPersonCap: number;
  currentActive: number;
}): number {
  if (args.centsPerEntry <= 0) return 0;
  return Math.max(
    0,
    Math.min(
      Math.floor(args.amountCents / args.centsPerEntry),
      args.perPersonCap - args.currentActive,
    ),
  );
}

type PhaseInput = {
  status: string;
  startsAt: Date;
  endsAt: Date;
  drawAt: Date;
};

export function giveawayPhase(c: PhaseInput, now: Date): GiveawayPhase {
  switch (c.status) {
    case "draft":
    case "drawing":
    case "drawn":
    case "completed":
    case "canceled":
      return c.status;
  }
  const t = now.getTime();
  if (t < c.startsAt.getTime()) return "scheduled";
  if (t < c.endsAt.getTime()) return "open";
  if (t < c.drawAt.getTime()) return "closed";
  return "ready_to_draw";
}

/** Checkout must start early enough that its session expires before entries close. */
export function donationsOpen(
  c: PhaseInput & { donationsEnabled: boolean },
  now: Date,
): boolean {
  return (
    c.donationsEnabled &&
    giveawayPhase(c, now) === "open" &&
    now.getTime() + DONATION_CUTOFF_MS <= c.endsAt.getTime()
  );
}
