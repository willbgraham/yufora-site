import { countEntryDays } from "./calendar";

/**
 * Free-entry parity. A donation is consideration, so the free method must
 * let anyone reach the same per-person maximum a donor can: entering free
 * on every entry day must reach the cap. Pure and isomorphic — the admin
 * form runs it live in the browser; go-live runs it on the snapped start.
 */

export type ParityInput = {
  perPersonCap: number;
  freeEntriesPerDay: number;
  entryDays: number;
};

export type ParitySummary = {
  ok: boolean;
  /** Most entries one person can collect free over the whole period. */
  maxFree: number;
  cap: number;
  entryDays: number;
  freeEntriesPerDay: number;
  /** Smallest free-entries-per-day that would pass at this cap. */
  suggestedFreePerDay: number;
};

export function maxFreeEntries(freeEntriesPerDay: number, entryDays: number) {
  return Math.max(0, freeEntriesPerDay * entryDays);
}

export function suggestFreeEntriesPerDay(cap: number, entryDays: number) {
  return entryDays > 0 ? Math.ceil(cap / entryDays) : cap;
}

export function getParitySummary(input: ParityInput): ParitySummary {
  const maxFree = maxFreeEntries(input.freeEntriesPerDay, input.entryDays);
  return {
    ok: input.entryDays > 0 && maxFree >= input.perPersonCap,
    maxFree,
    cap: input.perPersonCap,
    entryDays: input.entryDays,
    freeEntriesPerDay: input.freeEntriesPerDay,
    suggestedFreePerDay: suggestFreeEntriesPerDay(
      input.perPersonCap,
      input.entryDays,
    ),
  };
}

export function paritySummaryFor(
  c: {
    perPersonCap: number;
    freeEntriesPerDay: number;
    timezone: string;
    endsAt: Date;
  },
  from: Date,
): ParitySummary {
  return getParitySummary({
    perPersonCap: c.perPersonCap,
    freeEntriesPerDay: c.freeEntriesPerDay,
    entryDays: countEntryDays(from, c.endsAt, c.timezone),
  });
}
