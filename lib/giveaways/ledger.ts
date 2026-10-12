import "server-only";
import { and, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import type { Db } from "../db";
import {
  giveawayCampaigns,
  giveawayEntrants,
  giveawayEntries,
  type giveawayDonations,
} from "../db/schema";
import { entryDayIndex } from "./calendar";
import { CONFIRM_GRACE_MS } from "./constants";
import { donationGrant, freeGrant, giveawayPhase } from "./entries";
import type { PoolEntry } from "./types";

/**
 * Entry writes, always inside a transaction that holds:
 *   - the campaign row FOR SHARE (the pool lock takes it FOR UPDATE, so the
 *     pool can't change between being read and being frozen), and
 *   - the entrant row FOR UPDATE (one shared cap across both methods).
 * Every credit re-counts afterwards and throws past the cap, rolling the
 * whole transaction back — the cap holds even if a check above is wrong.
 */

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type Campaign = typeof giveawayCampaigns.$inferSelect;
export type Entrant = typeof giveawayEntrants.$inferSelect;
export type Donation = typeof giveawayDonations.$inferSelect;

export async function lockCampaign(
  tx: Tx,
  campaignId: string,
  mode: "share" | "update",
): Promise<Campaign | null> {
  const [row] = await tx
    .select()
    .from(giveawayCampaigns)
    .where(eq(giveawayCampaigns.id, campaignId))
    .for(mode);
  return row ?? null;
}

export async function lockEntrant(
  tx: Tx,
  entrantId: string,
  campaignId: string,
): Promise<Entrant | null> {
  const [row] = await tx
    .select()
    .from(giveawayEntrants)
    .where(
      and(
        eq(giveawayEntrants.id, entrantId),
        eq(giveawayEntrants.campaignId, campaignId),
      ),
    )
    .for("update");
  return row ?? null;
}

export async function countActiveEntries(tx: Tx | Db, entrantId: string) {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(giveawayEntries)
    .where(
      and(
        eq(giveawayEntries.entrantId, entrantId),
        eq(giveawayEntries.status, "active"),
      ),
    );
  return Number(row?.n ?? 0);
}

export async function countFreeOnDay(tx: Tx | Db, entrantId: string, day: number) {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(giveawayEntries)
    .where(
      and(
        eq(giveawayEntries.entrantId, entrantId),
        eq(giveawayEntries.method, "free"),
        eq(giveawayEntries.entryDay, day),
      ),
    );
  return Number(row?.n ?? 0);
}

async function assertWithinCap(tx: Tx, c: Campaign, entrantId: string) {
  const total = await countActiveEntries(tx, entrantId);
  if (total > c.perPersonCap) {
    throw new Error(
      `[giveaways] cap invariant violated for entrant ${entrantId}: ${total} > ${c.perPersonCap}`,
    );
  }
  return total;
}

export type FreeCreditResult =
  | { inserted: number; total: number; reason: null }
  | {
      inserted: 0;
      total: number;
      reason: "not_open" | "ineligible" | "already_today" | "cap";
    };

export async function creditFreeEntries(
  tx: Tx,
  c: Campaign,
  entrant: Entrant,
  now: Date,
): Promise<FreeCreditResult> {
  const current = await countActiveEntries(tx, entrant.id);
  if (c.status !== "live" || giveawayPhase(c, now) !== "open") {
    return { inserted: 0, total: current, reason: "not_open" };
  }
  if (entrant.status !== "active") {
    return { inserted: 0, total: current, reason: "ineligible" };
  }
  const day = entryDayIndex(c, now);
  const claimedToday = await countFreeOnDay(tx, entrant.id, day);
  const grant = freeGrant({
    freeEntriesPerDay: c.freeEntriesPerDay,
    perPersonCap: c.perPersonCap,
    currentActive: current,
    claimedToday,
  });
  if (grant === 0) {
    return {
      inserted: 0,
      total: current,
      reason: claimedToday >= c.freeEntriesPerDay ? "already_today" : "cap",
    };
  }
  const rows = await tx
    .insert(giveawayEntries)
    .values(
      Array.from({ length: grant }, (_, i) => ({
        campaignId: c.id,
        entrantId: entrant.id,
        method: "free" as const,
        entryDay: day,
        slot: claimedToday + i,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: giveawayEntries.id });
  const total = await assertWithinCap(tx, c, entrant.id);
  return { inserted: rows.length, total, reason: null };
}

export type DonationCreditNote = "cap_reached" | "not_open" | "entrant_ineligible";

/**
 * Bonus entries are computed here from the stored amount and the campaign's
 * frozen rate — never from session metadata. `inEntryPeriod` comes from the
 * Checkout Session itself (expires_at <= endsAt), so the webhook and the
 * pre-draw reconcile reach the same answer for the same session.
 */
export async function creditDonationEntries(
  tx: Tx,
  c: Campaign,
  entrant: Entrant,
  donation: Donation,
  opts: { inEntryPeriod: boolean; now: Date },
): Promise<{ credited: number; total: number; note: DonationCreditNote | null }> {
  const current = await countActiveEntries(tx, entrant.id);
  if (c.status !== "live" || !opts.inEntryPeriod) {
    return { credited: 0, total: current, note: "not_open" };
  }
  if (entrant.status !== "active" || !entrant.confirmedAt) {
    return { credited: 0, total: current, note: "entrant_ineligible" };
  }
  const grant = donationGrant({
    amountCents: donation.amountCents,
    centsPerEntry: donation.centsPerEntry,
    perPersonCap: c.perPersonCap,
    currentActive: current,
  });
  const full = Math.floor(donation.amountCents / donation.centsPerEntry);
  if (grant > 0) {
    const day = Math.max(0, entryDayIndex(c, opts.now));
    await tx.insert(giveawayEntries).values(
      Array.from({ length: grant }, (_, i) => ({
        campaignId: c.id,
        entrantId: entrant.id,
        method: "donation" as const,
        entryDay: day,
        slot: i,
        donationId: donation.id,
      })),
    );
  }
  const total = await assertWithinCap(tx, c, entrant.id);
  return { credited: grant, total, note: grant < full ? "cap_reached" : null };
}

/** The pool filter: active entries of active entrants who confirmed in time. */
export async function selectPool(tx: Tx | Db, c: Campaign): Promise<PoolEntry[]> {
  const graceEnd = new Date(c.endsAt.getTime() + CONFIRM_GRACE_MS);
  return tx
    .select({ entryId: giveawayEntries.id, entrantId: giveawayEntries.entrantId })
    .from(giveawayEntries)
    .innerJoin(giveawayEntrants, eq(giveawayEntrants.id, giveawayEntries.entrantId))
    .where(
      and(
        eq(giveawayEntries.campaignId, c.id),
        eq(giveawayEntries.status, "active"),
        isNull(giveawayEntries.drawId),
        eq(giveawayEntrants.status, "active"),
        isNotNull(giveawayEntrants.confirmedAt),
        lte(giveawayEntrants.confirmedAt, graceEnd),
      ),
    );
}
