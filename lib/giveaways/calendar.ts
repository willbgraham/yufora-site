/**
 * Giveaway calendar math. Entry days are LOCAL calendar days in the
 * giveaway's time zone; go-live validation, the daily free-entry dedupe and
 * the Rules all use these functions, so they can never disagree (DST
 * included). Pure and isomorphic.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const ymdFormatters = new Map<string, Intl.DateTimeFormat>();
const fullFormatters = new Map<string, Intl.DateTimeFormat>();

function ymdFormatter(tz: string): Intl.DateTimeFormat {
  let f = ymdFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    ymdFormatters.set(tz, f);
  }
  return f;
}

function fullFormatter(tz: string): Intl.DateTimeFormat {
  let f = fullFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    fullFormatters.set(tz, f);
  }
  return f;
}

/** "YYYY-MM-DD" of the instant, in tz. */
export function localIsoDate(instant: Date, tz: string): string {
  const parts = ymdFormatter(tz).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isoToUtcMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** True for a real calendar date in YYYY-MM-DD form. */
export function isValidIsoDate(iso: string): boolean {
  if (!ISO_DATE_RE.test(iso)) return false;
  const ms = isoToUtcMs(iso);
  return new Date(ms).toISOString().slice(0, 10) === iso;
}

/** Days since the Unix epoch of the instant's local date in tz. */
export function localDayNumber(instant: Date, tz: string): number {
  return isoToUtcMs(localIsoDate(instant, tz)) / DAY_MS;
}

export function addDaysIso(iso: string, days: number): string {
  return new Date(isoToUtcMs(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Local wall-clock minus UTC, in ms, at the instant. */
function tzOffsetMs(instant: number, tz: string): number {
  const parts = fullFormatter(tz).formatToParts(new Date(instant));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * The instant of local midnight starting `iso` in tz. US DST transitions
 * happen at 2 a.m., so midnight always exists exactly once; the second
 * pass corrects a guess that straddled a transition.
 */
export function zonedMidnight(iso: string, tz: string): Date {
  const guess = isoToUtcMs(iso);
  let candidate = guess - tzOffsetMs(guess, tz);
  const corrected = guess - tzOffsetMs(candidate, tz);
  if (corrected !== candidate) candidate = corrected;
  return new Date(candidate);
}

/** 0 on the first local day of the giveaway, 1 the next, … */
export function entryDayIndex(
  c: { startsAt: Date; timezone: string },
  now: Date,
): number {
  return localDayNumber(now, c.timezone) - localDayNumber(c.startsAt, c.timezone);
}

/**
 * Local calendar days on which someone can enter, from `from` (inclusive)
 * to `endsAt` (exclusive). A partial first day counts as a whole day: a
 * free entry is available on it.
 */
export function countEntryDays(from: Date, endsAt: Date, tz: string): number {
  if (endsAt.getTime() <= from.getTime()) return 0;
  return (
    localDayNumber(new Date(endsAt.getTime() - 1), tz) -
    localDayNumber(from, tz) +
    1
  );
}

/** The last local entry date ("YYYY-MM-DD") for an exclusive endsAt. */
export function lastEntryIsoDate(endsAt: Date, tz: string): string {
  return localIsoDate(new Date(endsAt.getTime() - 1), tz);
}

/** Next local midnight after `now` — when the next free entry opens. */
export function nextLocalMidnight(now: Date, tz: string): Date {
  return zonedMidnight(addDaysIso(localIsoDate(now, tz), 1), tz);
}
