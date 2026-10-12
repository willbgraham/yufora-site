import "server-only";
import { and, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "../db";
import {
  giveawayCampaigns,
  giveawayClaims,
  giveawayDonations,
  giveawayDraws,
  giveawayEntrants,
  giveawayEntries,
} from "../db/schema";
import { CONFIRM_GRACE_MS, DRAW_ALGORITHM, DRAW_ROUND_DELAY } from "./constants";
import {
  canonicalPool,
  finalSeed,
  poolHash,
  rankPool,
} from "./draw-core";
import {
  QUICKNET,
  checkBeaconHash,
  fetchLatest,
  fetchRound,
  roundAt,
  roundTimeMs,
} from "./drand";
import { verifyBeaconSignature } from "./drand-bls";
import { sendLockReceipt } from "./email";
import { dateTime } from "./format";
import { lockCampaign } from "./ledger";
import { reconcilePendingDonations } from "./reconcile";
import { giveawayUrls } from "./rules-template";
import { loadCharityLite, notifyClaim, staffEmails } from "./service";
import type { Beacon } from "./types";

/**
 * Two steps, each its own transaction:
 *   lockPool     — freeze the eligible entries, publish their hash, and FIX
 *                  the deciding drand round (a future one) before anyone
 *                  can know its value.
 *   completeDraw — fetch that round, verify it, compute the result, reveal
 *                  the seed. Idempotent and resumable: the round was fixed
 *                  at lock, so a retry after a timeout or crash computes
 *                  the identical result. There is no re-roll.
 */

export type DrandClient = {
  fetchLatest: () => Promise<Beacon>;
  fetchRound: (round: number) => Promise<Beacon | null>;
  verifySignature: (round: number, signature: string) => boolean;
};

export const defaultDrand: DrandClient = {
  fetchLatest: () => fetchLatest(),
  fetchRound: (round) => fetchRound(round),
  verifySignature: verifyBeaconSignature,
};

export type LockResult =
  | { status: "locked"; drawId: string; targetRound: number; targetRoundAt: Date }
  | { status: "already_locked" }
  | { status: "no_entries" }
  | {
      status: "error";
      code: "not_found" | "not_ready" | "pending_donations" | "drand_unavailable";
      message: string;
    };

export async function lockPool(args: {
  campaignId: string;
  charityId: string;
  userId: string | null;
  now: Date;
  drand?: DrandClient;
  reconcile?: (campaignId: string) => Promise<unknown>;
}): Promise<LockResult> {
  const drand = args.drand ?? defaultDrand;
  const reconcile = args.reconcile ?? ((id: string) => reconcilePendingDonations(id));
  const [pre] = await db
    .select({
      status: giveawayCampaigns.status,
      charityId: giveawayCampaigns.charityId,
      drawAt: giveawayCampaigns.drawAt,
    })
    .from(giveawayCampaigns)
    .where(eq(giveawayCampaigns.id, args.campaignId))
    .limit(1);
  if (!pre || pre.charityId !== args.charityId) {
    return { status: "error", code: "not_found", message: "Giveaway not found." };
  }
  if (pre.status === "drawing" || pre.status === "drawn") return { status: "already_locked" };
  if (pre.status !== "live" || args.now.getTime() < pre.drawAt.getTime()) {
    return {
      status: "error",
      code: "not_ready",
      message: "The winner can be drawn once entries have closed and the 24-hour confirmation window has passed.",
    };
  }

  // Paid entries must never miss the pool: settle pending donations with
  // Stripe first, and refuse while anything is unresolved (fail closed).
  try {
    await reconcile(args.campaignId);
  } catch (err) {
    console.error("[giveaways] reconcile before lock failed", err);
    return {
      status: "error",
      code: "pending_donations",
      message: "We couldn't confirm every donation with Stripe just now, so nothing was locked. Try again in a few minutes.",
    };
  }
  const [pending] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(giveawayDonations)
    .where(
      and(
        eq(giveawayDonations.campaignId, args.campaignId),
        eq(giveawayDonations.status, "pending"),
      ),
    );
  if (Number(pending?.n ?? 0) > 0) {
    return {
      status: "error",
      code: "pending_donations",
      message: "A donation is still being confirmed by Stripe. Try again in a few minutes.",
    };
  }

  let latestRound: number;
  try {
    latestRound = (await drand.fetchLatest()).round;
  } catch {
    return {
      status: "error",
      code: "drand_unavailable",
      message: "We couldn't reach drand, the public randomness service. Nothing was locked — try again shortly.",
    };
  }
  // Derive from both drand and our clock, so a skewed clock can't pick a
  // round that's already public.
  const targetRound = Math.max(latestRound, roundAt(args.now.getTime())) + DRAW_ROUND_DELAY;
  const targetRoundAt = new Date(roundTimeMs(targetRound));

  const result = await db.transaction(async (tx): Promise<LockResult> => {
    const c = await lockCampaign(tx, args.campaignId, "update");
    if (!c || c.status !== "live") return { status: "already_locked" };
    const graceEnd = new Date(c.endsAt.getTime() + CONFIRM_GRACE_MS);
    const eligible = and(
      eq(giveawayEntries.campaignId, c.id),
      eq(giveawayEntries.status, "active"),
      isNull(giveawayEntries.drawId),
      eq(giveawayEntrants.status, "active"),
      isNotNull(giveawayEntrants.confirmedAt),
      lte(giveawayEntrants.confirmedAt, graceEnd),
    );
    const pool = await tx
      .select({ entryId: giveawayEntries.id, entrantId: giveawayEntries.entrantId })
      .from(giveawayEntries)
      .innerJoin(giveawayEntrants, eq(giveawayEntrants.id, giveawayEntries.entrantId))
      .where(eligible);

    if (pool.length === 0) {
      await tx
        .update(giveawayCampaigns)
        .set({ status: "completed", outcome: "no_entries", completedAt: args.now })
        .where(and(eq(giveawayCampaigns.id, c.id), eq(giveawayCampaigns.status, "live")));
      return { status: "no_entries" };
    }

    const text = canonicalPool(pool);
    const drawId = crypto.randomUUID();
    const tagged = await tx
      .update(giveawayEntries)
      .set({ drawId })
      .where(
        inArray(
          giveawayEntries.id,
          tx
            .select({ id: giveawayEntries.id })
            .from(giveawayEntries)
            .innerJoin(giveawayEntrants, eq(giveawayEntrants.id, giveawayEntries.entrantId))
            .where(eligible),
        ),
      )
      .returning({ id: giveawayEntries.id });
    if (tagged.length !== pool.length) {
      throw new Error(`[giveaways] pool changed during lock: ${tagged.length} != ${pool.length}`);
    }
    await tx.insert(giveawayDraws).values({
      id: drawId,
      campaignId: c.id,
      algorithm: DRAW_ALGORITHM,
      lockedAt: args.now,
      lockedByUserId: args.userId,
      poolSize: pool.length,
      entrantCount: new Set(pool.map((p) => p.entrantId)).size,
      poolHash: poolHash(text),
      seedCommit: c.seedCommit as string,
      chainHash: QUICKNET.hash,
      latestRoundAtLock: latestRound,
      targetRound,
      targetRoundAt,
    });
    await tx
      .update(giveawayCampaigns)
      .set({ status: "drawing" })
      .where(and(eq(giveawayCampaigns.id, c.id), eq(giveawayCampaigns.status, "live")));
    return { status: "locked", drawId, targetRound, targetRoundAt };
  });

  // Awaited: on serverless a floating promise can be cut off, and the
  // receipt must leave before the deciding round is published.
  if (result.status === "locked") await sendReceipt(args.campaignId, args.charityId);
  return result;
}

async function sendReceipt(campaignId: string, charityId: string) {
  try {
    const [row] = await db
      .select({ campaign: giveawayCampaigns, draw: giveawayDraws })
      .from(giveawayDraws)
      .innerJoin(giveawayCampaigns, eq(giveawayCampaigns.id, giveawayDraws.campaignId))
      .where(eq(giveawayDraws.campaignId, campaignId))
      .limit(1);
    const charity = await loadCharityLite(charityId);
    if (!row || !charity) return;
    const to = [
      ...new Set(
        [charity.ownerEmail, ...staffEmails().slice(0, 1)]
          .filter((e): e is string => Boolean(e))
          .map((e) => e.toLowerCase()),
      ),
    ];
    if (to.length === 0) return;
    await sendLockReceipt({
      to,
      prizeName: row.campaign.prizeName,
      poolSize: row.draw.poolSize,
      entrantCount: row.draw.entrantCount,
      poolHash: row.draw.poolHash,
      targetRound: row.draw.targetRound,
      targetRoundLabel: dateTime(row.draw.targetRoundAt, row.campaign.timezone),
      verifyUrl: giveawayUrls(row.campaign.publicOrigin ?? "", charity.slug, campaignId).verify,
    });
  } catch (err) {
    console.error("[giveaways] lock receipt failed", err);
  }
}

export type CompleteResult =
  | { status: "drawn"; already: boolean }
  | { status: "waiting"; targetRound: number; targetRoundAt: Date }
  | { status: "error"; code: "not_locked" | "beacon_invalid" | "drand_unavailable"; message: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function completeDraw(args: {
  campaignId: string;
  now?: () => Date;
  drand?: DrandClient;
  waitBudgetMs?: number;
}): Promise<CompleteResult> {
  const drand = args.drand ?? defaultDrand;
  const clock = args.now ?? (() => new Date());
  const [draw] = await db
    .select()
    .from(giveawayDraws)
    .where(eq(giveawayDraws.campaignId, args.campaignId))
    .limit(1);
  if (!draw) return { status: "error", code: "not_locked", message: "Entries haven't been locked yet." };
  if (draw.completedAt) return { status: "drawn", already: true };

  const deadline = Date.now() + (args.waitBudgetMs ?? 40_000);
  let beacon: Beacon | null = null;
  for (;;) {
    try {
      beacon = await drand.fetchRound(draw.targetRound);
    } catch {
      beacon = null;
      if (Date.now() + 3000 > deadline) {
        return {
          status: "error",
          code: "drand_unavailable",
          message: "The draw couldn't finish because drand didn't respond. Nothing has been decided — try again, and the result will be the same whenever you retry.",
        };
      }
    }
    if (beacon) break;
    const untilRound = draw.targetRoundAt.getTime() - clock().getTime() + 500;
    const wait = Math.min(Math.max(1000, untilRound), deadline - Date.now() - 500);
    if (wait <= 0) {
      return { status: "waiting", targetRound: draw.targetRound, targetRoundAt: draw.targetRoundAt };
    }
    await sleep(wait);
  }
  if (
    beacon.round !== draw.targetRound ||
    !checkBeaconHash(beacon) ||
    !drand.verifySignature(beacon.round, beacon.signature)
  ) {
    console.error(`[giveaways] invalid beacon for round ${draw.targetRound}`, beacon);
    return {
      status: "error",
      code: "beacon_invalid",
      message: "drand returned a value that didn't verify, so we didn't use it. Try again shortly — the result will be the same.",
    };
  }

  const now = clock();
  const out = await db.transaction(async (tx) => {
    const c = await lockCampaign(tx, args.campaignId, "update");
    if (!c || c.status !== "drawing") return { already: true as const };
    const pool = await tx
      .select({ entryId: giveawayEntries.id, entrantId: giveawayEntries.entrantId })
      .from(giveawayEntries)
      .where(eq(giveawayEntries.drawId, draw.id));
    const text = canonicalPool(pool);
    if (poolHash(text) !== draw.poolHash) {
      throw new Error(`[giveaways] INTEGRITY: pool for draw ${draw.id} no longer matches its hash`);
    }
    const seed = c.serverSeed as string;
    const fs = finalSeed(seed, beacon.randomness, draw.poolHash);
    const results = rankPool(fs, pool);
    const done = await tx
      .update(giveawayDraws)
      .set({
        beaconRandomness: beacon.randomness,
        beaconSignature: beacon.signature,
        finalSeed: fs,
        serverSeed: seed,
        results,
        completedAt: now,
      })
      .where(and(eq(giveawayDraws.id, draw.id), isNull(giveawayDraws.completedAt)))
      .returning({ id: giveawayDraws.id });
    if (done.length === 0) return { already: true as const };
    await tx
      .update(giveawayCampaigns)
      .set({ status: "drawn" })
      .where(and(eq(giveawayCampaigns.id, c.id), eq(giveawayCampaigns.status, "drawing")));
    const [claim] = await tx
      .insert(giveawayClaims)
      .values({
        campaignId: c.id,
        drawId: draw.id,
        entrantId: results[0].entrantId,
        rank: 0,
        notifiedAt: now,
        deadlineAt: new Date(now.getTime() + c.claimDeadlineDays * 24 * 60 * 60 * 1000),
      })
      .returning();
    return { already: false as const, c, claim };
  });

  if (!out.already) await notifyClaim(out.c, out.claim, now);
  return { status: "drawn", already: out.already };
}

export type DrawOutcome = LockResult | CompleteResult;

/** The admin button: lock (if not yet), then wait for the round and finish. */
export async function lockAndDraw(args: {
  campaignId: string;
  charityId: string;
  userId: string | null;
  now: Date;
  drand?: DrandClient;
  waitBudgetMs?: number;
}): Promise<DrawOutcome> {
  const lock = await lockPool(args);
  if (lock.status === "error" || lock.status === "no_entries") return lock;
  return completeDraw({
    campaignId: args.campaignId,
    drand: args.drand,
    waitBudgetMs: args.waitBudgetMs,
  });
}
