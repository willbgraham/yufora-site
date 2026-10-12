import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  charities,
  giveawayCampaigns,
  giveawayClaims,
  giveawayDraws,
  giveawayEntrants,
  user,
} from "../db/schema";
import { hitAll } from "../throttle";
import { CONFIRM_GRACE_MS } from "./constants";
import { seedCommit } from "./draw-core";
import {
  sendCharityClaimDeclined,
  sendCharityWinnerAccepted,
  sendEntryConfirmation,
  sendEntryLinkAgain,
  sendWinnerNotification,
} from "./email";
import { giveawayPhase } from "./entries";
import { clockTime, dateTime, lastDay, longDate } from "./format";
import {
  creditFreeEntries,
  lockCampaign,
  lockEntrant,
  type Campaign,
  type Entrant,
} from "./ledger";
import {
  giveawayUrls,
  renderRules,
  rulesHashOf,
  rulesPlaceholders,
  rulesToText,
} from "./rules-template";
import {
  hashIdentifier,
  issueClaimToken,
  issueEntrantToken,
  checkFormToken,
  verifyToken,
} from "./tokens";
import {
  entryFormSchema,
  isExcludedEmail,
  normalizeEmail,
  validateForGoLive,
  type GiveawayDraftValues,
  type GoLiveCheck,
} from "./validation";

/**
 * Plain-argument cores for every giveaway action. Server actions are thin
 * wrappers (session/headers in, call these); tests call these directly.
 * Every function takes `now` explicitly so the clock is testable.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Prize value at which the winner is generally sent a 1099 (the reporting
 *  threshold rose from $600 for 2026 — PENDING accountant/counsel check). */
export const TAX_FORM_LIKELY_CENTS = 200_000;

export type RequestCtx = { now: Date; ip: string; ipCountry?: string | null };

export function staffEmails(): string[] {
  return (process.env.YUFORA_STAFF_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export type CharityLite = {
  id: string;
  name: string;
  slug: string;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
  billingExempt: boolean;
  embedPageUrl: string | null;
  ownerEmail: string | null;
};

export async function loadCharityLite(charityId: string): Promise<CharityLite | null> {
  const [row] = await db
    .select({
      id: charities.id,
      name: charities.name,
      slug: charities.slug,
      stripeAccountId: charities.stripeAccountId,
      stripeChargesEnabled: charities.stripeChargesEnabled,
      billingExempt: charities.billingExempt,
      embedPageUrl: charities.embedPageUrl,
      ownerEmail: user.email,
    })
    .from(charities)
    .leftJoin(user, eq(user.id, charities.ownerUserId))
    .where(eq(charities.id, charityId))
    .limit(1);
  return row ?? null;
}

async function loadCampaign(campaignId: string): Promise<Campaign | null> {
  const [row] = await db
    .select()
    .from(giveawayCampaigns)
    .where(eq(giveawayCampaigns.id, campaignId))
    .limit(1);
  return row ?? null;
}

function linksFor(c: Campaign, charity: CharityLite) {
  return giveawayUrls(c.publicOrigin ?? "", charity.slug, c.id);
}

export function entryUrlFor(c: Campaign, charity: CharityLite, entrantId: string, nowMs: number) {
  const token = issueEntrantToken(
    { campaignId: c.id, entrantId, endsAt: c.endsAt },
    nowMs,
  );
  return `${linksFor(c, charity).page}/entry?t=${token}`;
}

export function claimUrlFor(
  c: Campaign,
  charity: CharityLite,
  claim: { id: string; entrantId: string; deadlineAt: Date },
  nowMs: number,
) {
  const token = issueClaimToken(
    {
      campaignId: c.id,
      entrantId: claim.entrantId,
      claimId: claim.id,
      deadlineAt: claim.deadlineAt,
    },
    nowMs,
  );
  return `${linksFor(c, charity).page}/claim?t=${token}`;
}

/** "at 11:59 p.m. ET on November 30, 2026" */
export function endsLabel(c: { endsAt: Date; timezone: string }) {
  const last = lastDay(c.endsAt);
  return `at ${clockTime(last, c.timezone)} on ${longDate(last, c.timezone)}`;
}

/* ======================================================================== */
/* Public: entering                                                         */
/* ======================================================================== */

export type SubmitEntryResult =
  | { status: "success"; email: string }
  | {
      status: "error";
      code: "form_expired" | "closed" | "not_open_yet" | "rate_limited" | "excluded";
      message: string;
    }
  | { status: "error"; code: "invalid"; message: string; fieldErrors: Record<string, string> };

const ENTRY_MESSAGES = {
  form_expired: "This form timed out. Please reload the page and try again.",
  closed: "Entries for this giveaway are closed. Thanks for your interest!",
  not_open_yet: "This giveaway isn't open yet — check back soon.",
  rate_limited: "Too many entries from this connection. Please try again later.",
  invalid: "Please check the highlighted fields.",
} as const;

export async function submitEntry(args: {
  formToken: string | null;
  raw: Record<string, unknown>;
  honeypotFilled: boolean;
  ctx: RequestCtx;
}): Promise<SubmitEntryResult> {
  const { ctx } = args;
  const typedEmail = typeof args.raw.email === "string" ? args.raw.email.trim() : "";
  // Bots get the normal success screen — telling them they failed invites retries.
  if (args.honeypotFilled) return { status: "success", email: typedEmail };

  const ft = checkFormToken(args.formToken, ctx.now.getTime());
  if (!ft.ok) {
    if (ft.reason === "too_fast") return { status: "success", email: typedEmail };
    return { status: "error", code: "form_expired", message: ENTRY_MESSAGES.form_expired };
  }
  const ipKey = hashIdentifier("ip", ctx.ip);
  const allowed = await hitAll([
    { key: `gw:enter:ip:${ipKey}:${ft.campaignId}`, limit: 20, windowSec: 600 },
    { key: `gw:enter:ip:${ipKey}`, limit: 60, windowSec: 3600 },
    { key: `gw:ft:${ft.nonce}`, limit: 5, windowSec: 7200 },
  ]);
  if (!allowed) {
    return { status: "error", code: "rate_limited", message: ENTRY_MESSAGES.rate_limited };
  }

  const parsed = entryFormSchema.safeParse(args.raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    }
    return { status: "error", code: "invalid", message: ENTRY_MESSAGES.invalid, fieldErrors };
  }
  const v = parsed.data;
  const norm = normalizeEmail(v.email);

  const campaign = await loadCampaign(ft.campaignId);
  if (!campaign || campaign.status === "draft") {
    return { status: "error", code: "closed", message: ENTRY_MESSAGES.closed };
  }
  const charity = await loadCharityLite(campaign.charityId);
  if (!charity) return { status: "error", code: "closed", message: ENTRY_MESSAGES.closed };

  if (
    isExcludedEmail(norm, {
      domains: campaign.excludedEmailDomains,
      ownerEmail: charity.ownerEmail,
      staffEmails: staffEmails(),
    })
  ) {
    return {
      status: "error",
      code: "excluded",
      message: `Sorry — people who work for ${campaign.sponsorLegalName || charity.name} or Yufora can't enter this giveaway.`,
    };
  }

  const emailOk = await hitAll([
    { key: `gw:enter:em:${hashIdentifier("email", norm)}:${campaign.id}`, limit: 6, windowSec: 3600 },
  ]);
  if (!emailOk) {
    return { status: "error", code: "rate_limited", message: ENTRY_MESSAGES.rate_limited };
  }

  const outcome = await db.transaction(async (tx) => {
    const c = await lockCampaign(tx, campaign.id, "share");
    if (!c || c.status !== "live") return { kind: "closed" as const };
    const phase = giveawayPhase(c, ctx.now);
    if (phase === "scheduled") return { kind: "not_open_yet" as const };
    if (phase !== "open") return { kind: "closed" as const };

    const inserted = await tx
      .insert(giveawayEntrants)
      .values({
        campaignId: c.id,
        email: v.email,
        emailNormalized: norm,
        firstName: v.firstName,
        lastName: v.lastName,
        state: v.state,
        ageAttestedAt: ctx.now,
        rulesAcceptedAt: ctx.now,
        rulesHash: c.rulesHash as string,
        publicDisplayOptIn: v.publicDisplay,
        charityMarketingOptIn: v.marketing,
        ipHash: ipKey,
        ipCountry: ctx.ipCountry ?? null,
      })
      .onConflictDoNothing({
        target: [giveawayEntrants.campaignId, giveawayEntrants.emailNormalized],
      })
      .returning();
    const isNew = inserted.length > 0;
    let entrant: Entrant | null = inserted[0] ?? null;
    if (!entrant) {
      // Never overwrite an existing entrant's profile from a new submission.
      const [existing] = await tx
        .select()
        .from(giveawayEntrants)
        .where(
          and(
            eq(giveawayEntrants.campaignId, c.id),
            eq(giveawayEntrants.emailNormalized, norm),
          ),
        )
        .for("update");
      entrant = existing ?? null;
    }
    if (!entrant) return { kind: "closed" as const };
    // The form is itself a free entry method: today's entry is recorded now
    // and counts once the email is confirmed.
    if (entrant.status === "active" && (isNew || entrant.confirmedAt)) {
      await creditFreeEntries(tx, c, entrant, ctx.now);
    }
    return { kind: "ok" as const, c, entrant, isNew };
  });

  if (outcome.kind !== "ok") {
    return { status: "error", code: outcome.kind, message: ENTRY_MESSAGES[outcome.kind] };
  }

  const { c, entrant, isNew } = outcome;
  if (entrant.status === "active") {
    const mailOk =
      isNew ||
      (await hitAll([
        { key: `gw:mail:${entrant.id}`, limit: 1, windowSec: 600 },
        { key: `gw:mail:day:${entrant.id}`, limit: 5, windowSec: 86400 },
      ]));
    if (mailOk) await sendEntrantLink(c, charity, entrant, isNew, ctx.now);
  }
  return { status: "success", email: v.email };
}

async function sendEntrantLink(
  c: Campaign,
  charity: CharityLite,
  entrant: Entrant,
  isNew: boolean,
  now: Date,
) {
  const entryUrl = entryUrlFor(c, charity, entrant.id, now.getTime());
  const base = {
    to: entrant.email,
    firstName: entrant.firstName,
    charityName: charity.name,
    charityReplyTo: charity.ownerEmail,
    prizeName: c.prizeName,
    entryUrl,
    endsLabel: endsLabel(c),
  };
  if (isNew) {
    await sendEntryConfirmation({ ...base, rulesUrl: linksFor(c, charity).rules });
  } else {
    await sendEntryLinkAgain({ ...base, confirmed: Boolean(entrant.confirmedAt) });
  }
  await db
    .update(giveawayEntrants)
    .set({ lastConfirmEmailAt: now })
    .where(eq(giveawayEntrants.id, entrant.id));
}

type EntrantTokenResolution =
  | { ok: true; campaign: Campaign; entrant: Entrant }
  | { ok: false };

async function resolveEntrantToken(token: string | null, now: Date): Promise<EntrantTokenResolution> {
  const v = verifyToken(token, "entrant", now.getTime());
  if (!v.ok) return { ok: false };
  const [row] = await db
    .select({ entrant: giveawayEntrants, campaign: giveawayCampaigns })
    .from(giveawayEntrants)
    .innerJoin(giveawayCampaigns, eq(giveawayCampaigns.id, giveawayEntrants.campaignId))
    .where(
      and(
        eq(giveawayEntrants.id, v.payload.e),
        eq(giveawayEntrants.campaignId, v.payload.c),
      ),
    )
    .limit(1);
  return row ? { ok: true, ...row } : { ok: false };
}

export type ConfirmResult =
  | { status: "confirmed" | "already" | "late" }
  | { status: "invalid" | "rate_limited" | "closed" };

export async function confirmEntrant(args: {
  token: string | null;
  ctx: RequestCtx;
}): Promise<ConfirmResult> {
  const { ctx } = args;
  const r = await resolveEntrantToken(args.token, ctx.now);
  if (!r.ok) return { status: "invalid" };
  const ok = await hitAll([
    { key: `gw:tok:ip:${hashIdentifier("ip", ctx.ip)}`, limit: 60, windowSec: 3600 },
  ]);
  if (!ok) return { status: "rate_limited" };
  if (r.campaign.status === "draft" || r.campaign.status === "canceled") {
    return { status: "closed" };
  }
  if (r.entrant.confirmedAt) return { status: "already" };
  await db
    .update(giveawayEntrants)
    .set({ confirmedAt: ctx.now })
    .where(
      and(eq(giveawayEntrants.id, r.entrant.id), sql`${giveawayEntrants.confirmedAt} is null`),
    );
  const late = ctx.now.getTime() > r.campaign.endsAt.getTime() + CONFIRM_GRACE_MS;
  return { status: late ? "late" : "confirmed" };
}

export type DailyEntryResult =
  | { status: "added"; inserted: number; total: number }
  | {
      status:
        | "already_today"
        | "cap"
        | "closed"
        | "unconfirmed"
        | "ineligible"
        | "invalid"
        | "rate_limited";
    };

export async function claimDailyEntry(args: {
  token: string | null;
  ctx: RequestCtx;
}): Promise<DailyEntryResult> {
  const { ctx } = args;
  const r = await resolveEntrantToken(args.token, ctx.now);
  if (!r.ok) return { status: "invalid" };
  if (!r.entrant.confirmedAt) return { status: "unconfirmed" };
  const ok = await hitAll([
    { key: `gw:tok:ip:${hashIdentifier("ip", ctx.ip)}`, limit: 60, windowSec: 3600 },
  ]);
  if (!ok) return { status: "rate_limited" };
  return db.transaction(async (tx): Promise<DailyEntryResult> => {
    const c = await lockCampaign(tx, r.campaign.id, "share");
    if (!c) return { status: "invalid" };
    const entrant = await lockEntrant(tx, r.entrant.id, c.id);
    if (!entrant) return { status: "invalid" };
    const credit = await creditFreeEntries(tx, c, entrant, ctx.now);
    if (credit.reason === null) {
      return { status: "added", inserted: credit.inserted, total: credit.total };
    }
    return {
      status:
        credit.reason === "not_open"
          ? "closed"
          : credit.reason === "ineligible"
            ? "ineligible"
            : credit.reason,
    };
  });
}

/* ======================================================================== */
/* Admin: drafting and going live                                           */
/* ======================================================================== */

export async function createDraft(args: {
  charityId: string;
  values: GiveawayDraftValues;
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(giveawayCampaigns)
    .values({ charityId: args.charityId, ...args.values })
    .returning({ id: giveawayCampaigns.id });
  return row;
}

/** Zero rows unless it's still a draft: live giveaways are frozen. */
export async function updateDraft(args: {
  charityId: string;
  campaignId: string;
  values: GiveawayDraftValues;
}): Promise<"saved" | "locked"> {
  const rows = await db
    .update(giveawayCampaigns)
    .set(args.values)
    .where(
      and(
        eq(giveawayCampaigns.id, args.campaignId),
        eq(giveawayCampaigns.charityId, args.charityId),
        eq(giveawayCampaigns.status, "draft"),
      ),
    )
    .returning({ id: giveawayCampaigns.id });
  return rows.length > 0 ? "saved" : "locked";
}

export async function setPrizePhoto(args: {
  charityId: string;
  campaignId: string;
  url: string | null;
}): Promise<{ previous: string | null } | null> {
  const [current] = await db
    .select({ url: giveawayCampaigns.prizePhotoUrl })
    .from(giveawayCampaigns)
    .where(
      and(
        eq(giveawayCampaigns.id, args.campaignId),
        eq(giveawayCampaigns.charityId, args.charityId),
        eq(giveawayCampaigns.status, "draft"),
      ),
    )
    .limit(1);
  if (!current) return null;
  await db
    .update(giveawayCampaigns)
    .set({ prizePhotoUrl: args.url })
    .where(
      and(
        eq(giveawayCampaigns.id, args.campaignId),
        eq(giveawayCampaigns.charityId, args.charityId),
        eq(giveawayCampaigns.status, "draft"),
      ),
    );
  return { previous: current.url };
}

export async function deleteDraft(args: {
  charityId: string;
  campaignId: string;
}): Promise<{ deleted: boolean; photoUrl: string | null }> {
  const rows = await db
    .delete(giveawayCampaigns)
    .where(
      and(
        eq(giveawayCampaigns.id, args.campaignId),
        eq(giveawayCampaigns.charityId, args.charityId),
        eq(giveawayCampaigns.status, "draft"),
      ),
    )
    .returning({ photoUrl: giveawayCampaigns.prizePhotoUrl });
  return { deleted: rows.length > 0, photoUrl: rows[0]?.photoUrl ?? null };
}

export type GoLiveResult =
  | { status: "live" }
  | { status: "error"; code: "not_found" | "not_draft" | "attest" | "rules_incomplete"; message: string }
  | { status: "error"; code: "checks"; message: string; checks: GoLiveCheck[] };

export async function goLive(args: {
  charityId: string;
  campaignId: string;
  userId: string;
  attested: boolean;
  now: Date;
  origin: string;
  entitled: boolean;
  goLiveOpen: boolean;
  stripeConfigured: boolean;
}): Promise<GoLiveResult> {
  if (!args.attested) {
    return {
      status: "error",
      code: "attest",
      message: "Please confirm your organization is the Sponsor before going live.",
    };
  }
  const charity = await loadCharityLite(args.charityId);
  if (!charity) return { status: "error", code: "not_found", message: "Giveaway not found." };

  return db.transaction(async (tx): Promise<GoLiveResult> => {
    const c = await lockCampaign(tx, args.campaignId, "update");
    if (!c || c.charityId !== args.charityId) {
      return { status: "error", code: "not_found", message: "Giveaway not found." };
    }
    if (c.status !== "draft") {
      return { status: "error", code: "not_draft", message: "This giveaway is already live." };
    }
    const check = validateForGoLive(c, {
      now: args.now,
      goLiveOpen: args.goLiveOpen,
      entitled: args.entitled,
      stripe: {
        configured: args.stripeConfigured,
        accountId: charity.stripeAccountId,
        chargesEnabled: charity.stripeChargesEnabled,
      },
    });
    if (!check.ok) {
      return {
        status: "error",
        code: "checks",
        message: "Some items on the checklist still need fixing.",
        checks: check.checks,
      };
    }

    const serverSeed = randomBytes(32).toString("hex");
    const commit = seedCommit(serverSeed);
    const startsAt = check.snappedStartsAt;
    const doc = renderRules({
      ...c,
      startsAt,
      campaignId: c.id,
      charityName: charity.name,
      charitySlug: charity.slug,
      origin: args.origin,
      seedCommit: commit,
    });
    const text = rulesToText(doc);
    if (rulesPlaceholders(text).length > 0) {
      return {
        status: "error",
        code: "rules_incomplete",
        message: "Your Official Rules still have blanks to fill in.",
      };
    }
    const updated = await tx
      .update(giveawayCampaigns)
      .set({
        status: "live",
        startsAt,
        liveAt: args.now,
        liveByUserId: args.userId,
        publicOrigin: args.origin,
        rulesVersion: doc.version,
        rulesDocument: doc,
        rulesText: text,
        rulesHash: rulesHashOf(text),
        seedCommit: commit,
        serverSeed,
      })
      .where(and(eq(giveawayCampaigns.id, c.id), eq(giveawayCampaigns.status, "draft")))
      .returning({ id: giveawayCampaigns.id });
    if (updated.length === 0) {
      return { status: "error", code: "not_draft", message: "This giveaway is already live." };
    }
    return { status: "live" };
  });
}

/** Only before anyone could have entered, or with nobody entered yet;
 *  anything later is a Rules question and goes through Yufora staff. */
export async function cancelGiveaway(args: {
  charityId: string;
  campaignId: string;
  reason: string;
  now: Date;
}): Promise<"canceled" | "not_allowed"> {
  return db.transaction(async (tx) => {
    const c = await lockCampaign(tx, args.campaignId, "update");
    if (!c || c.charityId !== args.charityId || c.status !== "live") return "not_allowed";
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(giveawayEntrants)
      .where(eq(giveawayEntrants.campaignId, c.id));
    if (args.now.getTime() >= c.startsAt.getTime() && Number(n) > 0) return "not_allowed";
    await tx
      .update(giveawayCampaigns)
      .set({ status: "canceled", canceledAt: args.now, cancelReason: args.reason.slice(0, 500) })
      .where(and(eq(giveawayCampaigns.id, c.id), eq(giveawayCampaigns.status, "live")));
    return "canceled";
  });
}

/* ======================================================================== */
/* Claims                                                                   */
/* ======================================================================== */

export type ClaimResponseResult =
  | { status: "accepted" | "declined" }
  | {
      status: "error";
      code: "invalid" | "email_mismatch" | "expired" | "closed" | "attest" | "name" | "rate_limited";
      message: string;
    };

export async function respondToClaim(args: {
  token: string | null;
  decision: "accept" | "decline";
  typedEmail: string;
  legalName: string;
  phone: string;
  attested: boolean;
  ctx: RequestCtx;
}): Promise<ClaimResponseResult> {
  const { ctx } = args;
  const v = verifyToken(args.token, "claim", ctx.now.getTime());
  if (!v.ok) return { status: "error", code: "invalid", message: "This link doesn't work anymore." };
  const ok = await hitAll([{ key: `gw:claim:${v.payload.k}`, limit: 10, windowSec: 3600 }]);
  if (!ok) {
    return { status: "error", code: "rate_limited", message: "Too many attempts. Please try again in an hour." };
  }
  const [row] = await db
    .select({ entrant: giveawayEntrants, campaign: giveawayCampaigns })
    .from(giveawayClaims)
    .innerJoin(giveawayEntrants, eq(giveawayEntrants.id, giveawayClaims.entrantId))
    .innerJoin(giveawayCampaigns, eq(giveawayCampaigns.id, giveawayClaims.campaignId))
    .where(
      and(
        eq(giveawayClaims.id, v.payload.k),
        eq(giveawayClaims.campaignId, v.payload.c),
        eq(giveawayClaims.entrantId, v.payload.e),
      ),
    )
    .limit(1);
  if (!row) return { status: "error", code: "invalid", message: "This link doesn't work anymore." };
  if (normalizeEmail(args.typedEmail) !== row.entrant.emailNormalized) {
    return {
      status: "error",
      code: "email_mismatch",
      message: "That isn't the email address this prize was sent to.",
    };
  }
  if (args.decision === "accept") {
    if (!args.attested) {
      return { status: "error", code: "attest", message: "Please confirm you're eligible to accept the prize." };
    }
    if (args.legalName.trim().length < 2) {
      return { status: "error", code: "name", message: "Please enter your full legal name." };
    }
  }

  const result = await db.transaction(async (tx): Promise<ClaimResponseResult> => {
    const [claim] = await tx
      .select()
      .from(giveawayClaims)
      .where(eq(giveawayClaims.id, v.payload.k))
      .for("update");
    if (!claim || claim.status !== "notified") {
      return { status: "error", code: "closed", message: "This prize has already been answered." };
    }
    if (ctx.now.getTime() >= claim.deadlineAt.getTime()) {
      return { status: "error", code: "expired", message: "The claim window has closed." };
    }
    await tx
      .update(giveawayClaims)
      .set(
        args.decision === "accept"
          ? {
              status: "accepted",
              respondedAt: ctx.now,
              claimantLegalName: args.legalName.trim().slice(0, 160),
              claimantPhone: args.phone.trim().slice(0, 40) || null,
              responseIpHash: hashIdentifier("ip", ctx.ip),
            }
          : {
              status: "declined",
              respondedAt: ctx.now,
              responseIpHash: hashIdentifier("ip", ctx.ip),
            },
      )
      .where(and(eq(giveawayClaims.id, claim.id), eq(giveawayClaims.status, "notified")));
    return { status: args.decision === "accept" ? "accepted" : "declined" };
  });

  if (result.status === "accepted" || result.status === "declined") {
    const charity = await loadCharityLite(row.campaign.charityId);
    if (charity?.ownerEmail) {
      const adminUrl = `${row.campaign.publicOrigin}/admin/giveaways/${row.campaign.id}`;
      if (result.status === "accepted") {
        await sendCharityWinnerAccepted({
          to: charity.ownerEmail,
          prizeName: row.campaign.prizeName,
          winnerName: args.legalName.trim(),
          winnerEmail: row.entrant.email,
          acceptedLabel: longDate(ctx.now, row.campaign.timezone),
          adminUrl,
          taxFormLikely: row.campaign.prizeArvCents >= TAX_FORM_LIKELY_CENTS,
        });
      } else {
        await sendCharityClaimDeclined({
          to: charity.ownerEmail,
          prizeName: row.campaign.prizeName,
          claimDays: row.campaign.claimDeadlineDays,
          adminUrl,
        });
      }
    }
  }
  return result;
}

export type PassReason = "expired" | "declined" | "ineligible" | "unverified";

export type PromoteResult =
  | { status: "promoted"; rank: number }
  | { status: "exhausted" }
  | { status: "error"; code: "not_found" | "not_drawn" | "too_early" | "bad_reason"; message: string };

/**
 * Passes the prize to the next alternate. A notified winner's window can't
 * be cut short: "didn't respond" is only accepted after the deadline.
 * Alternates already disqualified are skipped; when none remain the
 * giveaway completes as unclaimed.
 */
export async function promoteNextAlternate(args: {
  charityId: string;
  campaignId: string;
  reason: PassReason;
  now: Date;
}): Promise<PromoteResult> {
  const out = await db.transaction(async (tx) => {
    const c = await lockCampaign(tx, args.campaignId, "update");
    if (!c || c.charityId !== args.charityId) {
      return { r: { status: "error", code: "not_found", message: "Giveaway not found." } as PromoteResult };
    }
    if (c.status !== "drawn") {
      return { r: { status: "error", code: "not_drawn", message: "The winner hasn't been drawn yet." } as PromoteResult };
    }
    const claims = await tx
      .select()
      .from(giveawayClaims)
      .where(eq(giveawayClaims.campaignId, c.id))
      .orderBy(desc(giveawayClaims.rank))
      .for("update");
    const latest = claims[0];
    if (!latest) {
      return { r: { status: "error", code: "not_drawn", message: "The winner hasn't been drawn yet." } as PromoteResult };
    }
    if (latest.status === "notified" || latest.status === "accepted") {
      if (args.reason === "declined") {
        return { r: { status: "error", code: "bad_reason", message: "They haven't declined." } as PromoteResult };
      }
      if (args.reason === "expired") {
        if (latest.status !== "notified" || args.now.getTime() < latest.deadlineAt.getTime()) {
          return {
            r: {
              status: "error",
              code: "too_early",
              message: "Their claim window is still open — the Rules give them until the deadline.",
            } as PromoteResult,
          };
        }
        await tx
          .update(giveawayClaims)
          .set({ status: "expired", closedReason: "expired" })
          .where(eq(giveawayClaims.id, latest.id));
      } else {
        await tx
          .update(giveawayClaims)
          .set({ status: "disqualified", closedReason: args.reason })
          .where(eq(giveawayClaims.id, latest.id));
        await tx
          .update(giveawayEntrants)
          .set({ status: "disqualified", disqualifiedAt: args.now, disqualifiedReason: args.reason })
          .where(eq(giveawayEntrants.id, latest.entrantId));
      }
    }

    const [draw] = await tx
      .select({ id: giveawayDraws.id, results: giveawayDraws.results })
      .from(giveawayDraws)
      .where(eq(giveawayDraws.campaignId, c.id))
      .limit(1);
    const results = draw?.results ?? [];
    const candidates = results.filter((r) => r.rank > latest.rank);
    let next: (typeof results)[number] | null = null;
    if (candidates.length > 0) {
      const states = await tx
        .select({ id: giveawayEntrants.id, status: giveawayEntrants.status })
        .from(giveawayEntrants)
        .where(inArray(giveawayEntrants.id, candidates.map((r) => r.entrantId)));
      const disq = new Set(states.filter((s) => s.status !== "active").map((s) => s.id));
      next = candidates.find((r) => !disq.has(r.entrantId)) ?? null;
    }
    if (!next || !draw) {
      await tx
        .update(giveawayCampaigns)
        .set({ status: "completed", outcome: "unclaimed", completedAt: args.now })
        .where(and(eq(giveawayCampaigns.id, c.id), eq(giveawayCampaigns.status, "drawn")));
      return { r: { status: "exhausted" } as PromoteResult };
    }
    const [claim] = await tx
      .insert(giveawayClaims)
      .values({
        campaignId: c.id,
        drawId: draw.id,
        entrantId: next.entrantId,
        rank: next.rank,
        notifiedAt: args.now,
        deadlineAt: new Date(args.now.getTime() + c.claimDeadlineDays * DAY_MS),
      })
      .returning();
    return { r: { status: "promoted", rank: next.rank } as PromoteResult, c, claim };
  });
  if (out.r.status === "promoted" && "claim" in out && out.claim && out.c) {
    await notifyClaim(out.c, out.claim, args.now);
  }
  return out.r;
}

/** Sends E4/E5 for a claim and stamps emailSentAt. Never throws. */
export async function notifyClaim(
  c: Campaign,
  claim: typeof giveawayClaims.$inferSelect,
  now: Date,
): Promise<void> {
  try {
    const charity = await loadCharityLite(c.charityId);
    const [entrant] = await db
      .select()
      .from(giveawayEntrants)
      .where(eq(giveawayEntrants.id, claim.entrantId))
      .limit(1);
    if (!charity || !entrant) return;
    const links = linksFor(c, charity);
    await sendWinnerNotification({
      to: entrant.email,
      firstName: entrant.firstName,
      charityName: charity.name,
      charityReplyTo: charity.ownerEmail,
      prizeName: c.prizeName,
      alternate: claim.rank > 0,
      arvCents: c.prizeArvCents,
      claimUrl: claimUrlFor(c, charity, claim, now.getTime()),
      deadlineLabel: dateTime(claim.deadlineAt, c.timezone),
      rulesUrl: links.rules,
      verifyUrl: links.verify,
    });
    await db
      .update(giveawayClaims)
      .set({ emailSentAt: now })
      .where(eq(giveawayClaims.id, claim.id));
  } catch (err) {
    console.error("[giveaways] claim notification failed", err);
  }
}

export async function resendClaimEmail(args: {
  charityId: string;
  campaignId: string;
  now: Date;
}): Promise<boolean> {
  const c = await loadCampaign(args.campaignId);
  if (!c || c.charityId !== args.charityId || c.status !== "drawn") return false;
  const [claim] = await db
    .select()
    .from(giveawayClaims)
    .where(and(eq(giveawayClaims.campaignId, c.id), eq(giveawayClaims.status, "notified")))
    .limit(1);
  if (!claim) return false;
  await notifyClaim(c, claim, args.now);
  return true;
}

export async function markPrizeAwarded(args: {
  charityId: string;
  campaignId: string;
  now: Date;
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    const c = await lockCampaign(tx, args.campaignId, "update");
    if (!c || c.charityId !== args.charityId || c.status !== "drawn") return false;
    const [claim] = await tx
      .select()
      .from(giveawayClaims)
      .where(and(eq(giveawayClaims.campaignId, c.id), eq(giveawayClaims.status, "accepted")))
      .for("update");
    if (!claim) return false;
    await tx
      .update(giveawayClaims)
      .set({ prizeAwardedAt: args.now })
      .where(eq(giveawayClaims.id, claim.id));
    await tx
      .update(giveawayCampaigns)
      .set({ status: "completed", outcome: "awarded", completedAt: args.now })
      .where(and(eq(giveawayCampaigns.id, c.id), eq(giveawayCampaigns.status, "drawn")));
    return true;
  });
}
