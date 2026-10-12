import { timezoneShort } from "./constants";

/**
 * Deterministic en-US formatting in the giveaway's own time zone. The Rules
 * snapshot is rendered with these, so they must not depend on the server's
 * locale or zone. Pure and isomorphic.
 */

const cache = new Map<string, Intl.DateTimeFormat>();

function fmt(tz: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${tz}|${JSON.stringify(opts)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts });
    cache.set(key, f);
  }
  return f;
}

function meridiem(s: string): string {
  return s.replace(/\s?AM\b/, " a.m.").replace(/\s?PM\b/, " p.m.");
}

/** "November 30, 2026" */
export function longDate(instant: Date, tz: string): string {
  return fmt(tz, { month: "long", day: "numeric", year: "numeric" }).format(instant);
}

/** "Monday, November 30, 2026" */
export function weekdayDate(instant: Date, tz: string): string {
  return fmt(tz, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(instant);
}

/** "Nov 30" (or "Nov 30, 2026" with year). */
export function shortDate(instant: Date, tz: string, withYear = false): string {
  return fmt(tz, {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(instant);
}

/** "11:59 p.m. ET" */
export function clockTime(instant: Date, tz: string, seconds = false): string {
  const t = fmt(tz, {
    hour: "numeric",
    minute: "2-digit",
    ...(seconds ? { second: "2-digit" } : {}),
  }).format(instant);
  return `${meridiem(t)} ${timezoneShort(tz)}`;
}

/** "November 30, 2026 at 11:59 p.m. ET" */
export function dateTime(instant: Date, tz: string): string {
  return `${longDate(instant, tz)} at ${clockTime(instant, tz)}`;
}

/** The last moment of an exclusive end: "11:59:59 p.m. ET on November 30, 2026". */
export function endMoment(endsAt: Date, tz: string): string {
  const last = new Date(endsAt.getTime() - 1000);
  return `${clockTime(last, tz, true)} on ${longDate(last, tz)}`;
}

/** The last entry day of an exclusive end, as a Date inside that day. */
export function lastDay(endsAt: Date): Date {
  return new Date(endsAt.getTime() - 1000);
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function money(cents: number): string {
  return cents % 100 === 0 ? usd.format(cents / 100) : usdCents.format(cents / 100);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

/** A prize name mid-sentence: "for a handmade guitar", not "for A handmade guitar". */
export function inlinePrize(name: string): string {
  return /^(A|An|The) [a-z]/.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : name;
}
