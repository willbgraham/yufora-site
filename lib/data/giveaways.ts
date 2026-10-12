import "server-only";
import { cache } from "react";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import {
  charities,
  giveawayCampaigns,
  giveawayClaims,
  giveawayDonations,
  giveawayDraws,
  giveawayEntrants,
  giveawayEntries,
} from "@/lib/db/schema";
import { csvDocument, csvField } from "@/lib/csv";
import { entryDayIndex, nextLocalMidnight } from "@/lib/giveaways/calendar";
import { canonicalPool } from "@/lib/giveaways/draw-core";
import { donationsOpen, giveawayPhase } from "@/lib/giveaways/entries";
import { issueFormToken, verifyToken } from "@/lib/giveaways/tokens";
import type { PublishedDraw } from "@/lib/giveaways/types";

/**
 * Giveaway reads. Public functions select EXPLICIT column lists: the
 * server seed is secret until the draw completes and must never reach a
 * public page — it is only ever published from the completed draw row.
 */

const PUBLIC_COLUMNS = {
  id: giveawayCampaigns.id,
  charityId: giveawayCampaigns.charityId,
  status: giveawayCampaigns.status,
  outcome: giveawayCampaigns.outcome,
  prizeName: giveawayCampaigns.prizeName,
  prizeDescription: giveawayCampaigns.prizeDescription,
  prizeArvCents: giveawayCampaigns.prizeArvCents,
  prizePhotoUrl: giveawayCampaigns.prizePhotoUrl,
  timezone: giveawayCampaigns.timezone,
  startsAt: giveawayCampaigns.startsAt,
  endsAt: giveawayCampaigns.endsAt,
  drawAt: giveawayCampaigns.drawAt,
  perPersonCap: giveawayCampaigns.perPersonCap,
  freeEntriesPerDay: giveawayCampaigns.freeEntriesPerDay,
  donationsEnabled: giveawayCampaigns.donationsEnabled,
  centsPerEntry: giveawayCampaigns.centsPerEntry,
  claimDeadlineDays: giveawayCampaigns.claimDeadlineDays,
  sponsorLegalName: giveawayCampaigns.sponsorLegalName,
  sitePageUrl: giveawayCampaigns.sitePageUrl,
  liveAt: giveawayCampaigns.liveAt,
  rulesVersion: giveawayCampaigns.rulesVersion,
  rulesHash: giveawayCampaigns.rulesHash,
  seedCommit: giveawayCampaigns.seedCommit,
};

export const PUBLIC_GIVEAWAY_KEYS = Object.keys(PUBLIC_COLUMNS);

export type PublicGiveaway = {
  id: string;
  charityId: string;
  status: string;
  outcome: string | null;
  prizeName: string;
  prizeDescription: string;
  prizeArvCents: number;
  prizePhotoUrl: string | null;
  timezone: string;
  startsAt: Date;
  endsAt: Date;
  drawAt: Date;
  perPersonCap: number;
  freeEntriesPerDay: number;
  donationsEnabled: boolean;
  centsPerEntry: number | null;
  claimDeadlineDays: number;
  sponsorLegalName: string;
  sitePageUrl: string | null;
  liveAt: Date | null;
  rulesVersion: string | null;
  rulesHash: string | null;
  seedCommit: string | null;
};

export type PublicCharity = {
  id: string;
  name: string;
  slug: string;
  embedPageUrl: string | null;
};

const CHARITY_COLUMNS = {
  id: charities.id,
  name: charities.name,
  slug: charities.slug,
  embedPageUrl: charities.embedPageUrl,
};

/** Live (or finished) giveaways only — drafts are invisible. */
export const getPublicGiveaway = cache(
  async (
    charitySlug: string,
    campaignId: string,
  ): Promise<{ charity: PublicCharity; giveaway: PublicGiveaway } | null> => {
    const [row] = await db
      .select({ giveaway: PUBLIC_COLUMNS, charity: CHARITY_COLUMNS })
      .from(giveawayCampaigns)
      .innerJoin(charities, eq(charities.id, giveawayCampaigns.charityId))
      .where(
        and(
          eq(charities.slug, charitySlug),
          eq(giveawayCampaigns.id, campaignId),
          ne(giveawayCampaigns.status, "draft"),
        ),
      )
      .limit(1);
    return row ?? null;
  },
);

/** The entry form needs a signed token minted at render time — which also
 *  forces the page to render per request (never from a cache). */
export async function issueEntryFormToken(campaignId: string): Promise<string> {
  await connection();
  return issueFormToken(campaignId);
}

export async function getPublicRules(charitySlug: string, campaignId: string) {
  const [row] = await db
    .select({
      document: giveawayCampaigns.rulesDocument,
      hash: giveawayCampaigns.rulesHash,
      liveAt: giveawayCampaigns.liveAt,
      timezone: giveawayCampaigns.timezone,
      charityName: charities.name,
    })
    .from(giveawayCampaigns)
    .innerJoin(charities, eq(charities.id, giveawayCampaigns.charityId))
    .where(
      and(
        eq(charities.slug, charitySlug),
        eq(giveawayCampaigns.id, campaignId),
        ne(giveawayCampaigns.status, "draft"),
      ),
    )
    .limit(1);
  if (!row?.document || !row.hash || !row.liveAt) return null;
  return row as typeof row & {
    document: NonNullable<typeof row.document>;
    hash: string;
    liveAt: Date;
  };
}

export type DrawView =
  | { stage: "none" }
  | {
      stage: "locked";
      poolHash: string;
      poolSize: number;
      entrantCount: number;
      targetRound: number;
      targetRoundAt: Date;
      lockedAt: Date;
    }
  | { stage: "complete"; published: PublishedDraw; completedAt: Date };

export async function getDrawView(campaignId: string): Promise<DrawView> {
  const [d] = await db
    .select()
    .from(giveawayDraws)
    .where(eq(giveawayDraws.campaignId, campaignId))
    .limit(1);
  if (!d) return { stage: "none" };
  if (
    !d.completedAt ||
    !d.serverSeed ||
    !d.finalSeed ||
    !d.results ||
    !d.beaconRandomness ||
    !d.beaconSignature
  ) {
    return {
      stage: "locked",
      poolHash: d.poolHash,
      poolSize: d.poolSize,
      entrantCount: d.entrantCount,
      targetRound: d.targetRound,
      targetRoundAt: d.targetRoundAt,
      lockedAt: d.lockedAt,
    };
  }
  return {
    stage: "complete",
    completedAt: d.completedAt,
    published: {
      algorithm: d.algorithm,
      seedCommit: d.seedCommit,
      poolHash: d.poolHash,
      poolSize: d.poolSize,
      entrantCount: d.entrantCount,
      chainHash: d.chainHash,
      latestRoundAtLock: d.latestRoundAtLock,
      targetRound: d.targetRound,
      lockedAt: d.lockedAt.toISOString(),
      beacon: {
        round: d.targetRound,
        randomness: d.beaconRandomness,
        signature: d.beaconSignature,
      },
      serverSeed: d.serverSeed,
      finalSeed: d.finalSeed,
      results: d.results,
    },
  };
}

/** The anonymous, canonical entry list of a locked draw (no names, no emails). */
export async function getPoolText(campaignId: string): Promise<string | null> {
  const [d] = await db
    .select({ id: giveawayDraws.id })
    .from(giveawayDraws)
    .where(eq(giveawayDraws.campaignId, campaignId))
    .limit(1);
  if (!d) return null;
  const pool = await db
    .select({ entryId: giveawayEntries.id, entrantId: giveawayEntries.entrantId })
    .from(giveawayEntries)
    .where(eq(giveawayEntries.drawId, d.id));
  return canonicalPool(pool);
}

/** "Ana R." — only after the winner accepted AND agreed to be shown. */
export async function getPublicWinnerName(campaignId: string): Promise<string | null> {
  const [row] = await db
    .select({
      firstName: giveawayEntrants.firstName,
      lastName: giveawayEntrants.lastName,
      optIn: giveawayEntrants.publicDisplayOptIn,
    })
    .from(giveawayClaims)
    .innerJoin(giveawayEntrants, eq(giveawayEntrants.id, giveawayClaims.entrantId))
    .where(and(eq(giveawayClaims.campaignId, campaignId), eq(giveawayClaims.status, "accepted")))
    .limit(1);
  if (!row || !row.optIn) return null;
  return `${row.firstName} ${row.lastName.charAt(0).toUpperCase()}.`;
}

/* ------------------------------------------------------------------------ */
/* Entrant page (/entry?t=)                                                  */
/* ------------------------------------------------------------------------ */

export type EntrantView = {
  charity: PublicCharity;
  giveaway: PublicGiveaway;
  entrant: {
    id: string;
    firstName: string;
    email: string;
    confirmed: boolean;
    active: boolean;
  };
  totals: { active: number; free: number; bonus: number };
  claimedToday: boolean;
  nextFreeAt: Date;
  remaining: number;
  donationsOpen: boolean;
  /** Their own entry ids — how they check they're in the published pool. */
  entryIds: string[];
};

export async function getEntrantView(
  token: string | null,
  now: Date,
): Promise<EntrantView | null> {
  await connection();
  const v = verifyToken(token, "entrant", now.getTime());
  if (!v.ok) return null;
  const [row] = await db
    .select({
      giveaway: PUBLIC_COLUMNS,
      charity: CHARITY_COLUMNS,
      entrant: {
        id: giveawayEntrants.id,
        firstName: giveawayEntrants.firstName,
        email: giveawayEntrants.email,
        confirmedAt: giveawayEntrants.confirmedAt,
        status: giveawayEntrants.status,
      },
    })
    .from(giveawayEntrants)
    .innerJoin(giveawayCampaigns, eq(giveawayCampaigns.id, giveawayEntrants.campaignId))
    .innerJoin(charities, eq(charities.id, giveawayCampaigns.charityId))
    .where(
      and(eq(giveawayEntrants.id, v.payload.e), eq(giveawayEntrants.campaignId, v.payload.c)),
    )
    .limit(1);
  if (!row) return null;

  const entries = await db
    .select({
      id: giveawayEntries.id,
      method: giveawayEntries.method,
      status: giveawayEntries.status,
      entryDay: giveawayEntries.entryDay,
    })
    .from(giveawayEntries)
    .where(eq(giveawayEntries.entrantId, row.entrant.id))
    .orderBy(giveawayEntries.createdAt);
  const active = entries.filter((e) => e.status === "active");
  const today = entryDayIndex(row.giveaway, now);
  const claimedToday =
    entries.filter((e) => e.method === "free" && e.entryDay === today).length >=
    row.giveaway.freeEntriesPerDay;

  return {
    charity: row.charity,
    giveaway: row.giveaway,
    entrant: {
      id: row.entrant.id,
      firstName: row.entrant.firstName,
      email: row.entrant.email,
      confirmed: Boolean(row.entrant.confirmedAt),
      active: row.entrant.status === "active",
    },
    totals: {
      active: active.length,
      free: active.filter((e) => e.method === "free").length,
      bonus: active.filter((e) => e.method === "donation").length,
    },
    claimedToday,
    nextFreeAt: nextLocalMidnight(now, row.giveaway.timezone),
    remaining: Math.max(0, row.giveaway.perPersonCap - active.length),
    donationsOpen: donationsOpen(row.giveaway, now),
    entryIds: active.map((e) => e.id),
  };
}

/* ------------------------------------------------------------------------ */
/* Claim page (/claim?t=)                                                    */
/* ------------------------------------------------------------------------ */

export async function getClaimView(token: string | null, now: Date) {
  await connection();
  const v = verifyToken(token, "claim", now.getTime());
  if (!v.ok) return null;
  const [row] = await db
    .select({
      claim: {
        id: giveawayClaims.id,
        rank: giveawayClaims.rank,
        status: giveawayClaims.status,
        deadlineAt: giveawayClaims.deadlineAt,
        respondedAt: giveawayClaims.respondedAt,
      },
      entrant: {
        firstName: giveawayEntrants.firstName,
        email: giveawayEntrants.email,
        state: giveawayEntrants.state,
      },
      giveaway: PUBLIC_COLUMNS,
      charity: CHARITY_COLUMNS,
    })
    .from(giveawayClaims)
    .innerJoin(giveawayEntrants, eq(giveawayEntrants.id, giveawayClaims.entrantId))
    .innerJoin(giveawayCampaigns, eq(giveawayCampaigns.id, giveawayClaims.campaignId))
    .innerJoin(charities, eq(charities.id, giveawayCampaigns.charityId))
    .where(
      and(
        eq(giveawayClaims.id, v.payload.k),
        eq(giveawayClaims.campaignId, v.payload.c),
        eq(giveawayClaims.entrantId, v.payload.e),
      ),
    )
    .limit(1);
  if (!row) return null;
  return { ...row, expired: now.getTime() >= row.claim.deadlineAt.getTime() };
}

/* ======================================================================== */
/* Admin                                                                    */
/* ======================================================================== */

/** Everything the admin needs EXCEPT the server seed. */
const ADMIN_COLUMNS = {
  ...PUBLIC_COLUMNS,
  sponsorStreet: giveawayCampaigns.sponsorStreet,
  sponsorCity: giveawayCampaigns.sponsorCity,
  sponsorState: giveawayCampaigns.sponsorState,
  sponsorZip: giveawayCampaigns.sponsorZip,
  sponsorPrivacyUrl: giveawayCampaigns.sponsorPrivacyUrl,
  excludedEmailDomains: giveawayCampaigns.excludedEmailDomains,
  canceledAt: giveawayCampaigns.canceledAt,
  completedAt: giveawayCampaigns.completedAt,
  createdAt: giveawayCampaigns.createdAt,
};

export type AdminGiveaway = NonNullable<Awaited<ReturnType<typeof getGiveawayForCharity>>>;

export async function getGiveawayForCharity(campaignId: string, charityId: string) {
  const [row] = await db
    .select(ADMIN_COLUMNS)
    .from(giveawayCampaigns)
    .where(and(eq(giveawayCampaigns.id, campaignId), eq(giveawayCampaigns.charityId, charityId)))
    .limit(1);
  return row ?? null;
}

export async function getFrozenRulesForCharity(campaignId: string, charityId: string) {
  const [row] = await db
    .select({ document: giveawayCampaigns.rulesDocument })
    .from(giveawayCampaigns)
    .where(and(eq(giveawayCampaigns.id, campaignId), eq(giveawayCampaigns.charityId, charityId)))
    .limit(1);
  return row?.document ?? null;
}

export async function getGiveawaysForCharity(charityId: string) {
  const rows = await db
    .select(ADMIN_COLUMNS)
    .from(giveawayCampaigns)
    .where(eq(giveawayCampaigns.charityId, charityId))
    .orderBy(desc(giveawayCampaigns.createdAt));
  if (rows.length === 0) return [];
  const counts = await db
    .select({
      campaignId: giveawayEntrants.campaignId,
      n: sql<number>`count(*) filter (where ${giveawayEntrants.confirmedAt} is not null)::int`,
    })
    .from(giveawayEntrants)
    .where(inArray(giveawayEntrants.campaignId, rows.map((r) => r.id)))
    .groupBy(giveawayEntrants.campaignId);
  const byId = new Map(counts.map((c) => [c.campaignId, Number(c.n)]));
  return rows.map((r) => ({ ...r, confirmedEntrants: byId.get(r.id) ?? 0 }));
}

/** Prefills a new giveaway's Sponsor details from the charity's last one. */
export async function getSponsorDefaults(charityId: string) {
  const [row] = await db
    .select({
      sponsorLegalName: giveawayCampaigns.sponsorLegalName,
      sponsorStreet: giveawayCampaigns.sponsorStreet,
      sponsorCity: giveawayCampaigns.sponsorCity,
      sponsorState: giveawayCampaigns.sponsorState,
      sponsorZip: giveawayCampaigns.sponsorZip,
      sponsorPrivacyUrl: giveawayCampaigns.sponsorPrivacyUrl,
      excludedEmailDomains: giveawayCampaigns.excludedEmailDomains,
    })
    .from(giveawayCampaigns)
    .where(and(eq(giveawayCampaigns.charityId, charityId), ne(giveawayCampaigns.sponsorLegalName, "")))
    .orderBy(desc(giveawayCampaigns.createdAt))
    .limit(1);
  return row ?? null;
}

export async function getGiveawayStats(campaignId: string) {
  const [entrants] = await db
    .select({
      confirmed: sql<number>`count(*) filter (where ${giveawayEntrants.confirmedAt} is not null and ${giveawayEntrants.status} = 'active')::int`,
      unconfirmed: sql<number>`count(*) filter (where ${giveawayEntrants.confirmedAt} is null)::int`,
      optedIn: sql<number>`count(*) filter (where ${giveawayEntrants.charityMarketingOptIn} and ${giveawayEntrants.confirmedAt} is not null)::int`,
    })
    .from(giveawayEntrants)
    .where(eq(giveawayEntrants.campaignId, campaignId));
  const [entries] = await db
    .select({
      free: sql<number>`count(*) filter (where ${giveawayEntries.method} = 'free')::int`,
      bonus: sql<number>`count(*) filter (where ${giveawayEntries.method} = 'donation')::int`,
    })
    .from(giveawayEntries)
    .innerJoin(giveawayEntrants, eq(giveawayEntrants.id, giveawayEntries.entrantId))
    .where(
      and(
        eq(giveawayEntries.campaignId, campaignId),
        eq(giveawayEntries.status, "active"),
        sql`${giveawayEntrants.confirmedAt} is not null`,
      ),
    );
  const [money] = await db
    .select({
      raisedCents: sql<number>`coalesce(sum(${giveawayDonations.amountCents}) filter (where ${giveawayDonations.status} = 'succeeded'), 0)::int`,
      gifts: sql<number>`count(*) filter (where ${giveawayDonations.status} = 'succeeded')::int`,
      refunded: sql<number>`count(*) filter (where ${giveawayDonations.status} = 'refunded')::int`,
    })
    .from(giveawayDonations)
    .where(eq(giveawayDonations.campaignId, campaignId));
  return {
    confirmed: Number(entrants?.confirmed ?? 0),
    unconfirmed: Number(entrants?.unconfirmed ?? 0),
    optedIn: Number(entrants?.optedIn ?? 0),
    freeEntries: Number(entries?.free ?? 0),
    bonusEntries: Number(entries?.bonus ?? 0),
    raisedCents: Number(money?.raisedCents ?? 0),
    gifts: Number(money?.gifts ?? 0),
    refunded: Number(money?.refunded ?? 0),
  };
}

export async function getLatestEntrants(campaignId: string, limit = 50) {
  return db
    .select({
      id: giveawayEntrants.id,
      firstName: giveawayEntrants.firstName,
      lastName: giveawayEntrants.lastName,
      email: giveawayEntrants.email,
      state: giveawayEntrants.state,
      confirmedAt: giveawayEntrants.confirmedAt,
      status: giveawayEntrants.status,
      optedIn: giveawayEntrants.charityMarketingOptIn,
      createdAt: giveawayEntrants.createdAt,
      entries: sql<number>`(select count(*)::int from giveaway_entries ge where ge.entrant_id = "giveaway_entrants"."id" and ge.status = 'active')`,
    })
    .from(giveawayEntrants)
    .where(eq(giveawayEntrants.campaignId, campaignId))
    .orderBy(desc(giveawayEntrants.createdAt))
    .limit(limit);
}

export async function getClaimsForCampaign(campaignId: string) {
  return db
    .select({
      id: giveawayClaims.id,
      rank: giveawayClaims.rank,
      status: giveawayClaims.status,
      notifiedAt: giveawayClaims.notifiedAt,
      emailSentAt: giveawayClaims.emailSentAt,
      deadlineAt: giveawayClaims.deadlineAt,
      respondedAt: giveawayClaims.respondedAt,
      claimantLegalName: giveawayClaims.claimantLegalName,
      claimantPhone: giveawayClaims.claimantPhone,
      closedReason: giveawayClaims.closedReason,
      prizeAwardedAt: giveawayClaims.prizeAwardedAt,
      entrant: {
        firstName: giveawayEntrants.firstName,
        lastName: giveawayEntrants.lastName,
        email: giveawayEntrants.email,
        state: giveawayEntrants.state,
      },
    })
    .from(giveawayClaims)
    .innerJoin(giveawayEntrants, eq(giveawayEntrants.id, giveawayClaims.entrantId))
    .where(eq(giveawayClaims.campaignId, campaignId))
    .orderBy(giveawayClaims.rank);
}

export async function hasRunningGiveaway(charityId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: giveawayCampaigns.id })
    .from(giveawayCampaigns)
    .where(
      and(
        eq(giveawayCampaigns.charityId, charityId),
        inArray(giveawayCampaigns.status, ["live", "drawing", "drawn"]),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export type AttentionItem = {
  campaignId: string;
  prizeName: string;
  kind: "ready_to_draw" | "claim_lapsed" | "claim_declined" | "claim_accepted" | "drawing";
};

/** What the dashboard strip nags about — stands in for time-based emails. */
export async function getGiveawaysNeedingAttention(
  charityId: string,
  now: Date,
): Promise<AttentionItem[]> {
  const rows = await db
    .select({
      id: giveawayCampaigns.id,
      prizeName: giveawayCampaigns.prizeName,
      status: giveawayCampaigns.status,
      startsAt: giveawayCampaigns.startsAt,
      endsAt: giveawayCampaigns.endsAt,
      drawAt: giveawayCampaigns.drawAt,
    })
    .from(giveawayCampaigns)
    .where(
      and(
        eq(giveawayCampaigns.charityId, charityId),
        inArray(giveawayCampaigns.status, ["live", "drawing", "drawn"]),
      ),
    );
  const items: AttentionItem[] = [];
  for (const r of rows) {
    if (r.status === "drawing") {
      items.push({ campaignId: r.id, prizeName: r.prizeName, kind: "drawing" });
    } else if (r.status === "live" && giveawayPhase(r, now) === "ready_to_draw") {
      items.push({ campaignId: r.id, prizeName: r.prizeName, kind: "ready_to_draw" });
    } else if (r.status === "drawn") {
      const [latest] = await db
        .select({ status: giveawayClaims.status, deadlineAt: giveawayClaims.deadlineAt, prizeAwardedAt: giveawayClaims.prizeAwardedAt })
        .from(giveawayClaims)
        .where(eq(giveawayClaims.campaignId, r.id))
        .orderBy(desc(giveawayClaims.rank))
        .limit(1);
      if (!latest) continue;
      if (latest.status === "accepted" && !latest.prizeAwardedAt) {
        items.push({ campaignId: r.id, prizeName: r.prizeName, kind: "claim_accepted" });
      } else if (latest.status === "declined") {
        items.push({ campaignId: r.id, prizeName: r.prizeName, kind: "claim_declined" });
      } else if (latest.status === "notified" && now >= latest.deadlineAt) {
        items.push({ campaignId: r.id, prizeName: r.prizeName, kind: "claim_lapsed" });
      }
    }
  }
  return items;
}

/* ------------------------------------------------------------------------ */
/* CSV export                                                               */
/* ------------------------------------------------------------------------ */

export async function getEntrantsExport(campaignId: string, charityId: string, onlyOptedIn: boolean) {
  const owned = await getGiveawayForCharity(campaignId, charityId);
  if (!owned) return null;
  const rows = await db
    .select({
      firstName: giveawayEntrants.firstName,
      lastName: giveawayEntrants.lastName,
      email: giveawayEntrants.email,
      state: giveawayEntrants.state,
      confirmedAt: giveawayEntrants.confirmedAt,
      createdAt: giveawayEntrants.createdAt,
      status: giveawayEntrants.status,
      optedIn: giveawayEntrants.charityMarketingOptIn,
      publicDisplay: giveawayEntrants.publicDisplayOptIn,
      // Correlated subqueries spell out table names: drizzle renders
      // columns unqualified in single-table selects, which would bind the
      // outer "id" to the inner table.
      free: sql<number>`(select count(*)::int from giveaway_entries ge where ge.entrant_id = "giveaway_entrants"."id" and ge.status = 'active' and ge.method = 'free')`,
      bonus: sql<number>`(select count(*)::int from giveaway_entries ge where ge.entrant_id = "giveaway_entrants"."id" and ge.status = 'active' and ge.method = 'donation')`,
      donatedCents: sql<number>`(select coalesce(sum(gd.amount_cents), 0)::int from giveaway_donations gd where gd.entrant_id = "giveaway_entrants"."id" and gd.status = 'succeeded')`,
    })
    .from(giveawayEntrants)
    .where(
      and(
        eq(giveawayEntrants.campaignId, campaignId),
        onlyOptedIn
          ? and(eq(giveawayEntrants.charityMarketingOptIn, true), sql`${giveawayEntrants.confirmedAt} is not null`)
          : undefined,
      ),
    )
    .orderBy(giveawayEntrants.createdAt);
  return { giveaway: owned, rows };
}

export function entrantsToCsv(rows: NonNullable<Awaited<ReturnType<typeof getEntrantsExport>>>["rows"]): string {
  const header =
    "First name,Last name,Email,State,Confirmed,First entry,Free entries,Bonus entries,Total entries,Donated (USD),Joined your list,Show name if winner,Status";
  return csvDocument(
    header,
    rows.map((r) =>
      [
        csvField(r.firstName),
        csvField(r.lastName),
        csvField(r.email),
        r.state,
        r.confirmedAt ? r.confirmedAt.toISOString() : "",
        r.createdAt.toISOString(),
        Number(r.free),
        Number(r.bonus),
        Number(r.free) + Number(r.bonus),
        (Number(r.donatedCents) / 100).toFixed(2),
        r.optedIn ? "Yes" : "No",
        r.publicDisplay ? "Yes" : "No",
        r.status,
      ].join(","),
    ),
  );
}
