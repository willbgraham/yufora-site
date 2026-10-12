import { z } from "zod";
import { isUsStateCode } from "../us-states";
import {
  addDaysIso,
  countEntryDays,
  isValidIsoDate,
  localIsoDate,
  zonedMidnight,
} from "./calendar";
import {
  CENTS_PER_ENTRY_MAX,
  CENTS_PER_ENTRY_MIN,
  CLAIM_DAYS_MAX,
  CLAIM_DAYS_MIN,
  CONFIRM_GRACE_MS,
  ELIGIBLE_STATES,
  FREE_ENTRIES_PER_DAY_MAX,
  MAX_ARV_CENTS,
  MAX_ENTRY_DAYS,
  PER_PERSON_CAP_MAX,
  isGiveawayTimezone,
} from "./constants";
import { paritySummaryFor, type ParitySummary } from "./parity";

/** Isomorphic validation shared by the admin form, the actions and go-live. */

const DAY_MS = 24 * 60 * 60 * 1000;

function parseWholeDollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(parseFloat(cleaned) * 100);
  return Number.isFinite(cents) ? cents : null;
}

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v),
    "Enter a full web address starting with https://",
  );

const intField = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, message)
    .transform(Number)
    .refine((n) => n >= min && n <= max, message);

export const giveawayDraftSchema = z.object({
  prizeName: z
    .string()
    .trim()
    .min(2, "Please name the prize")
    .max(120, "Keep the prize name under 120 characters"),
  prizeDescription: z
    .string()
    .trim()
    .max(2000, "Keep the description under 2,000 characters")
    .default(""),
  prizeArv: z.string().trim().min(1, "Enter the prize's value, like 450"),
  startDate: z.string().trim().refine(isValidIsoDate, "Pick when entries open"),
  endDate: z.string().trim().refine(isValidIsoDate, "Pick when entries close"),
  timezone: z.string().refine(isGiveawayTimezone, "Choose a time zone"),
  freeEntriesPerDay: intField(
    1,
    FREE_ENTRIES_PER_DAY_MAX,
    `Enter a whole number from 1 to ${FREE_ENTRIES_PER_DAY_MAX}`,
  ),
  perPersonCap: intField(
    1,
    PER_PERSON_CAP_MAX,
    `Enter a whole number from 1 to ${PER_PERSON_CAP_MAX}`,
  ),
  donationsEnabled: z.boolean(),
  dollarsPerEntry: z.string().trim().default(""),
  claimDeadlineDays: intField(
    CLAIM_DAYS_MIN,
    CLAIM_DAYS_MAX,
    `Enter a number of days from ${CLAIM_DAYS_MIN} to ${CLAIM_DAYS_MAX}`,
  ),
  sponsorLegalName: z.string().trim().max(160).default(""),
  sponsorStreet: z.string().trim().max(160).default(""),
  sponsorCity: z.string().trim().max(80).default(""),
  sponsorState: z
    .string()
    .trim()
    .refine((v) => v === "" || isUsStateCode(v), "Choose a state")
    .default(""),
  sponsorZip: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{5}(-\d{4})?$/.test(v), "Enter a 5-digit ZIP code")
    .default(""),
  sponsorPrivacyUrl: optionalUrl.default(""),
  sitePageUrl: optionalUrl.default(""),
  excludedEmailDomains: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) =>
        v === "" ||
        v
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
          .every((d) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d)),
      "List domains separated by commas, like example.org",
    )
    .default(""),
});

export type GiveawayDraftValues = {
  prizeName: string;
  prizeDescription: string;
  prizeArvCents: number;
  timezone: string;
  startsAt: Date;
  endsAt: Date;
  drawAt: Date;
  freeEntriesPerDay: number;
  perPersonCap: number;
  donationsEnabled: boolean;
  centsPerEntry: number | null;
  claimDeadlineDays: number;
  sponsorLegalName: string;
  sponsorStreet: string;
  sponsorCity: string;
  sponsorState: string;
  sponsorZip: string;
  sponsorPrivacyUrl: string | null;
  sitePageUrl: string | null;
  excludedEmailDomains: string;
};

export type DraftParseResult =
  | { ok: true; values: GiveawayDraftValues }
  | { ok: false; fieldErrors: Record<string, string> };

export function readDraftForm(fd: FormData): Record<string, unknown> {
  const get = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    prizeName: get("prizeName"),
    prizeDescription: get("prizeDescription"),
    prizeArv: get("prizeArv"),
    startDate: get("startDate"),
    endDate: get("endDate"),
    timezone: get("timezone"),
    freeEntriesPerDay: get("freeEntriesPerDay"),
    perPersonCap: get("perPersonCap"),
    donationsEnabled: fd.get("donationsEnabled") === "on",
    dollarsPerEntry: get("dollarsPerEntry"),
    claimDeadlineDays: get("claimDeadlineDays"),
    sponsorLegalName: get("sponsorLegalName"),
    sponsorStreet: get("sponsorStreet"),
    sponsorCity: get("sponsorCity"),
    sponsorState: get("sponsorState"),
    sponsorZip: get("sponsorZip"),
    sponsorPrivacyUrl: get("sponsorPrivacyUrl"),
    sitePageUrl: get("sitePageUrl"),
    excludedEmailDomains: get("excludedEmailDomains"),
  };
}

/** Validates a draft save. Completeness (sponsor, description) is a
 *  go-live check, not a save check — drafts can be saved half-done. */
export function parseGiveawayDraft(
  raw: Record<string, unknown>,
  now: Date,
): DraftParseResult {
  const parsed = giveawayDraftSchema.safeParse(raw);
  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, fieldErrors };
  }
  const d = parsed.data;

  const arv = parseWholeDollarsToCents(d.prizeArv);
  if (arv === null || arv <= 0) {
    fieldErrors.prizeArv = "Enter the prize's value, like 450";
  } else if (arv >= MAX_ARV_CENTS) {
    fieldErrors.prizeArv =
      "Prizes must be worth less than $5,000. Above that, some states require registration and a bond — we don't support that.";
  }

  let centsPerEntry: number | null = null;
  if (d.donationsEnabled) {
    const c = parseWholeDollarsToCents(d.dollarsPerEntry);
    if (
      c === null ||
      c % 100 !== 0 ||
      c < CENTS_PER_ENTRY_MIN ||
      c > CENTS_PER_ENTRY_MAX
    ) {
      fieldErrors.dollarsPerEntry = "Enter a whole-dollar amount of $5 or more.";
    } else {
      centsPerEntry = c;
    }
  }

  const tz = d.timezone;
  const today = localIsoDate(now, tz);
  if (d.endDate < d.startDate) {
    fieldErrors.endDate = "The end has to be on or after the start";
  } else if (d.endDate < today) {
    fieldErrors.endDate = "The end date has passed";
  } else {
    const span =
      (Date.parse(d.endDate) - Date.parse(d.startDate)) / DAY_MS + 1;
    if (span > MAX_ENTRY_DAYS) {
      fieldErrors.endDate = `Giveaways can run up to ${MAX_ENTRY_DAYS} days`;
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const startsAt = zonedMidnight(d.startDate, tz);
  const endsAt = zonedMidnight(addDaysIso(d.endDate, 1), tz);
  return {
    ok: true,
    values: {
      prizeName: d.prizeName,
      prizeDescription: d.prizeDescription,
      prizeArvCents: arv as number,
      timezone: tz,
      startsAt,
      endsAt,
      drawAt: new Date(endsAt.getTime() + CONFIRM_GRACE_MS),
      freeEntriesPerDay: d.freeEntriesPerDay,
      perPersonCap: d.perPersonCap,
      donationsEnabled: d.donationsEnabled,
      centsPerEntry,
      claimDeadlineDays: d.claimDeadlineDays,
      sponsorLegalName: d.sponsorLegalName,
      sponsorStreet: d.sponsorStreet,
      sponsorCity: d.sponsorCity,
      sponsorState: d.sponsorState,
      sponsorZip: d.sponsorZip,
      sponsorPrivacyUrl: d.sponsorPrivacyUrl || null,
      sitePageUrl: d.sitePageUrl || null,
      excludedEmailDomains: d.excludedEmailDomains
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .join(","),
    },
  };
}

/* ------------------------------------------------------------------------ */
/* Entry form                                                               */
/* ------------------------------------------------------------------------ */

const ELIGIBLE = new Set<string>(ELIGIBLE_STATES);

export const entryFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Please enter your first name")
    .max(60, "Please shorten your first name"),
  lastName: z
    .string()
    .trim()
    .min(1, "Please enter your last name")
    .max(60, "Please shorten your last name"),
  email: z
    .email("Please enter a valid email address")
    .max(160, "Please use a shorter email address"),
  state: z
    .string()
    .trim()
    .min(1, "Please choose your state")
    .refine((s) => s !== "RI", "Sorry — Rhode Island residents can't enter this giveaway.")
    .refine((s) => s === "RI" || ELIGIBLE.has(s), "Please choose your state"),
  ageConfirm: z.literal("on", { message: "Please confirm you're eligible to enter" }),
  rulesAgree: z.literal("on", { message: "Please agree to the Official Rules to enter" }),
  publicDisplay: z.boolean(),
  marketing: z.boolean(),
});

export type EntryFormValues = z.infer<typeof entryFormSchema>;

export function readEntryForm(fd: FormData): Record<string, unknown> {
  const get = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    firstName: get("firstName"),
    lastName: get("lastName"),
    email: get("email")?.trim(),
    state: get("state"),
    ageConfirm: get("ageConfirm"),
    rulesAgree: get("rulesAgree"),
    publicDisplay: fd.get("publicDisplay") === "on",
    marketing: fd.get("marketing") === "on",
  };
}

/** Lowercase, drop +tags, and fold Gmail's dot-insensitivity, so one inbox
 *  is one entrant. The original address is still what we email. */
export function normalizeEmail(email: string): string {
  const lower = email.trim().toLowerCase();
  const at = lower.lastIndexOf("@");
  if (at < 1) return lower;
  let local = lower.slice(0, at);
  let domain = lower.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus > 0) local = local.slice(0, plus);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

function domainMatches(domain: string, rule: string): boolean {
  return domain === rule || domain.endsWith(`.${rule}`);
}

/**
 * Sponsor and Administrator personnel can't enter (Rules §2). Always
 * excludes yufora.com, Yufora staff and the charity owner's own address,
 * plus any domains the charity lists (its staff and board).
 */
export function isExcludedEmail(
  normalized: string,
  ctx: { domains: string; ownerEmail?: string | null; staffEmails: string[] },
): boolean {
  const domain = normalized.slice(normalized.lastIndexOf("@") + 1);
  const rules = ["yufora.com", ...ctx.domains.split(",")]
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (rules.some((r) => domainMatches(domain, r))) return true;
  const people = [ctx.ownerEmail, ...ctx.staffEmails]
    .filter((e): e is string => Boolean(e))
    .map(normalizeEmail);
  return people.includes(normalized);
}

/* ------------------------------------------------------------------------ */
/* Go-live                                                                  */
/* ------------------------------------------------------------------------ */

export type GoLiveCheck =
  | { key: "approval"; ok: boolean }
  | { key: "plan"; ok: boolean }
  | { key: "sponsor"; ok: boolean; missing: string[] }
  | { key: "prize"; ok: boolean; problem?: "description" | "value" }
  | {
      key: "dates";
      ok: boolean;
      problem?: "ended" | "too_soon" | "too_long";
      entryDays: number;
    }
  | { key: "parity"; ok: boolean; summary: ParitySummary }
  | {
      key: "stripe";
      ok: boolean;
      problem?: "not_configured" | "not_connected" | "charges_disabled";
    };

export type GoLiveInput = {
  prizeName: string;
  prizeDescription: string;
  prizeArvCents: number;
  timezone: string;
  startsAt: Date;
  endsAt: Date;
  freeEntriesPerDay: number;
  perPersonCap: number;
  donationsEnabled: boolean;
  centsPerEntry: number | null;
  sponsorLegalName: string;
  sponsorStreet: string;
  sponsorCity: string;
  sponsorState: string;
  sponsorZip: string;
};

export type GoLiveContext = {
  now: Date;
  goLiveOpen: boolean;
  entitled: boolean;
  stripe: { configured: boolean; accountId: string | null; chargesEnabled: boolean };
};

/** Entries must stay open at least this long after going live. */
const MIN_REMAINING_MS = 24 * 60 * 60 * 1000;

export function validateForGoLive(
  c: GoLiveInput,
  ctx: GoLiveContext,
): { ok: boolean; checks: GoLiveCheck[]; snappedStartsAt: Date } {
  const snappedStartsAt = new Date(
    Math.max(c.startsAt.getTime(), ctx.now.getTime()),
  );
  const checks: GoLiveCheck[] = [];

  checks.push({ key: "approval", ok: ctx.goLiveOpen });
  checks.push({ key: "plan", ok: ctx.entitled });

  const missing: string[] = [];
  if (c.sponsorLegalName.length < 2) missing.push("legal name");
  if (!c.sponsorStreet) missing.push("street address");
  if (!c.sponsorCity) missing.push("city");
  if (!isUsStateCode(c.sponsorState)) missing.push("state");
  if (!/^\d{5}(-\d{4})?$/.test(c.sponsorZip)) missing.push("ZIP code");
  checks.push({ key: "sponsor", ok: missing.length === 0, missing });

  const prizeProblem =
    c.prizeArvCents <= 0 || c.prizeArvCents >= MAX_ARV_CENTS
      ? "value"
      : c.prizeDescription.trim().length < 20
        ? "description"
        : undefined;
  checks.push({ key: "prize", ok: !prizeProblem, problem: prizeProblem });

  const entryDays = countEntryDays(snappedStartsAt, c.endsAt, c.timezone);
  const remaining = c.endsAt.getTime() - snappedStartsAt.getTime();
  const datesProblem =
    remaining <= 0
      ? "ended"
      : remaining < MIN_REMAINING_MS
        ? "too_soon"
        : entryDays > MAX_ENTRY_DAYS
          ? "too_long"
          : undefined;
  checks.push({ key: "dates", ok: !datesProblem, problem: datesProblem, entryDays });

  const summary = paritySummaryFor(c, snappedStartsAt);
  checks.push({ key: "parity", ok: summary.ok, summary });

  if (c.donationsEnabled) {
    const problem = !ctx.stripe.configured
      ? "not_configured"
      : !ctx.stripe.accountId
        ? "not_connected"
        : !ctx.stripe.chargesEnabled
          ? "charges_disabled"
          : c.centsPerEntry === null
            ? "not_configured"
            : undefined;
    checks.push({ key: "stripe", ok: !problem, problem });
  }

  return { ok: checks.every((ch) => ch.ok), checks, snappedStartsAt };
}
