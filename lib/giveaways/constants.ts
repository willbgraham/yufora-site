import { US_STATES, type UsStateCode } from "../us-states";

/**
 * Giveaway constants. Isomorphic and import-light: lib/db/schema.ts reads
 * ELIGIBLE_STATES_SQL for a CHECK constraint, and the browser verifier
 * imports draw constants, so this file must stay free of server code and
 * path aliases.
 */

/** Rhode Island has its own registration and bonding rules for prize
 *  promotions; excluded outright rather than supported (pending counsel). */
export const EXCLUDED_STATES: readonly UsStateCode[] = ["RI"];

export const ELIGIBLE_STATES: readonly UsStateCode[] = US_STATES.map(
  (s) => s.code,
).filter((code) => !EXCLUDED_STATES.includes(code));

/** Literal list for the entrant state CHECK. Codes are fixed two-letter
 *  uppercase strings from our own table, so raw interpolation is safe. */
export const ELIGIBLE_STATES_SQL = ELIGIBLE_STATES.map((c) => `'${c}'`).join(
  ",",
);

/**
 * Minimum entry age by state. Age of majority is 19 in Alabama and
 * Nebraska and 21 in Mississippi; everywhere else 18. PENDING COUNSEL —
 * the Rules, the entry checkbox and the claim attestation all read this.
 */
const AGE_OVERRIDES: Partial<Record<UsStateCode, number>> = {
  AL: 19,
  NE: 19,
  MS: 21,
};

export function minimumAgeFor(state: string): number {
  return AGE_OVERRIDES[state as UsStateCode] ?? 18;
}

/** US zones a giveaway can be scheduled in; the Rules state every time in it. */
export const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)", short: "ET" },
  { value: "America/Chicago", label: "Central (CT)", short: "CT" },
  { value: "America/Denver", label: "Mountain (MT)", short: "MT" },
  { value: "America/Phoenix", label: "Arizona (MST)", short: "MST" },
  { value: "America/Los_Angeles", label: "Pacific (PT)", short: "PT" },
  { value: "America/Anchorage", label: "Alaska (AKT)", short: "AKT" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)", short: "HT" },
] as const;

export type GiveawayTimezone = (typeof US_TIMEZONES)[number]["value"];

export function isGiveawayTimezone(tz: string): tz is GiveawayTimezone {
  return US_TIMEZONES.some((z) => z.value === tz);
}

export function timezoneShort(tz: string): string {
  return US_TIMEZONES.find((z) => z.value === tz)?.short ?? tz;
}

/** Prize value must stay under this (cents): New York and Florida require
 *  registration and bonding above $5,000 in prizes. */
export const MAX_ARV_CENTS = 500_000;

/** Longest entry period. Bounds the "subscribe for one month, run a giveaway
 *  for a year" gap left by letting live giveaways outlast a lapsed plan. */
export const MAX_ENTRY_DAYS = 90;

/** Winner plus this many alternates are drawn at once. */
export const ALTERNATES = 3;

/** Entries confirmed by email up to this long after the end still count;
 *  the same window absorbs late Stripe webhooks. drawAt = endsAt + this. */
export const CONFIRM_GRACE_MS = 24 * 60 * 60 * 1000;

/** Checkout is refused this close to the end; the session expires at
 *  now + this, so every paid session closes before entries do. Stripe's
 *  minimum session lifetime is 30 minutes. */
export const DONATION_CUTOFF_MS = 31 * 60 * 1000;

/** The Rules promise the drawing within this many days of the end. */
export const DRAW_WITHIN_DAYS = 7;

/** drand rounds between lock and the beacon that decides the draw (~30s). */
export const DRAW_ROUND_DELAY = 10;

export const MAX_POOL = 1_000_000;

export const FREE_ENTRIES_PER_DAY_MAX = 10;
export const PER_PERSON_CAP_MAX = 1000;
export const CLAIM_DAYS_MIN = 3;
export const CLAIM_DAYS_MAX = 30;
/** Whole dollars per bonus entry. */
export const CENTS_PER_ENTRY_MIN = 500;
export const CENTS_PER_ENTRY_MAX = 100_000;

/**
 * The version of rules-template.ts + legal-copy.ts. Going live requires
 * GIVEAWAYS_APPROVED_RULES_VERSION to equal this, so ANY edit to the
 * counsel-reviewed text must bump it — which closes go-live until the new
 * text is re-approved.
 */
export const RULES_TEMPLATE_VERSION = "draft-2026-10";

export const DRAW_ALGORITHM = "yufora-draw-v1";
