import { stateName } from "../us-states";
import { countEntryDays } from "./calendar";
import { giveawayPhase } from "./entries";
import { longDate, money, plural, shortDate } from "./format";
import type { ParitySummary } from "./parity";
import type { GoLiveCheck } from "./validation";

/** Copy for statuses and checklists. Isomorphic (admin client components use it). */

export type DisplayStatus =
  | "draft"
  | "scheduled"
  | "live"
  | "closed"
  | "drawing"
  | "drawn"
  | "complete"
  | "canceled";

type StatusInput = {
  status: string;
  startsAt: Date;
  endsAt: Date;
  drawAt: Date;
  timezone: string;
};

export function displayStatus(c: StatusInput, now: Date): DisplayStatus {
  const phase = giveawayPhase(c, now);
  switch (phase) {
    case "open":
      return "live";
    case "ready_to_draw":
      return "closed";
    case "completed":
      return "complete";
    default:
      return phase;
  }
}

export function statusLabel(c: StatusInput, now: Date, short = false): string {
  const s = displayStatus(c, now);
  switch (s) {
    case "draft":
      return short ? "Draft" : "Draft — not visible to anyone";
    case "scheduled":
      return `Opens ${shortDate(c.startsAt, c.timezone)}`;
    case "live": {
      const left = countEntryDays(now, c.endsAt, c.timezone);
      return left <= 1 ? "Live · ends today" : `Live · ${left} days left`;
    }
    case "closed":
      return now >= c.drawAt ? "Ended — ready to draw" : "Ended — confirmations closing";
    case "drawing":
      return "Drawing…";
    case "drawn":
      return "Winner drawn";
    case "complete":
      return "Complete";
    case "canceled":
      return "Canceled";
  }
}

export const STATUS_TONE: Record<DisplayStatus, string> = {
  draft: "bg-warm-100 text-warm-600",
  scheduled: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
  live: "bg-teal-100 text-teal-700",
  closed: "bg-pink-100 text-pink-700",
  drawing: "bg-warm-100 text-warm-700",
  drawn: "bg-teal-100 text-teal-700",
  complete: "bg-warm-100 text-warm-700",
  canceled: "bg-warm-100 text-warm-500",
};

export function parityLine(p: ParitySummary, lastDayLabel: string): {
  ok: boolean;
  text: string;
} {
  const per =
    p.freeEntriesPerDay === 1 ? "once a day" : `${p.freeEntriesPerDay} times a day`;
  if (p.entryDays <= 0) {
    return { ok: false, text: "Pick dates first — the entry limit is checked against them." };
  }
  if (p.ok) {
    return {
      ok: true,
      text: `Entering free ${per} reaches the ${p.cap}-entry limit by ${lastDayLabel}.`,
    };
  }
  return {
    ok: false,
    text: `Entering free ${per} only reaches ${p.maxFree} ${p.maxFree === 1 ? "entry" : "entries"} by ${lastDayLabel}. Lower the limit to ${p.maxFree}, allow ${p.suggestedFreePerDay} free entries a day, or end later.`,
  };
}

export type ChecklistRow = {
  key: GoLiveCheck["key"];
  ok: boolean;
  text: string;
  fix?: { href: string; label: string };
};

export function checklistRows(
  checks: GoLiveCheck[],
  c: {
    prizeArvCents: number;
    sponsorLegalName: string;
    sponsorCity: string;
    sponsorState: string;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
  },
): ChecklistRow[] {
  const lastDay = new Date(c.endsAt.getTime() - 1000);
  return checks
    .filter((ch) => ch.key !== "approval")
    .map((ch): ChecklistRow => {
      switch (ch.key) {
        case "plan":
          return ch.ok
            ? { key: ch.key, ok: true, text: "Your plan includes Giveaways" }
            : {
                key: ch.key,
                ok: false,
                text: "Your plan doesn't include Giveaways yet",
                fix: { href: "/admin/billing?need=giveaways", label: "See plans" },
              };
        case "sponsor":
          return ch.ok
            ? {
                key: ch.key,
                ok: true,
                text: `Sponsor: ${c.sponsorLegalName}, ${c.sponsorCity}, ${stateName(c.sponsorState)}`,
              }
            : {
                key: ch.key,
                ok: false,
                text: `Add your organization's ${ch.missing.join(", ")}`,
                fix: { href: "#sponsor", label: "Add details" },
              };
        case "prize":
          return ch.ok
            ? {
                key: ch.key,
                ok: true,
                text: `Prize worth ${money(c.prizeArvCents)} — under the $5,000 limit`,
              }
            : {
                key: ch.key,
                ok: false,
                text:
                  ch.problem === "description"
                    ? "Describe the prize — your Official Rules need it"
                    : "Set a prize value under $5,000",
                fix: { href: "#prize", label: "Fix the prize" },
              };
        case "dates": {
          if (ch.ok) {
            return {
              key: ch.key,
              ok: true,
              text: `Runs ${shortDate(c.startsAt, c.timezone)} – ${shortDate(lastDay, c.timezone, true)} (${plural(ch.entryDays, "day")})`,
            };
          }
          const text =
            ch.problem === "ended"
              ? "The end date has passed"
              : ch.problem === "too_soon"
                ? "Entries need to stay open at least a day after going live"
                : "Giveaways can run up to 90 days";
          return { key: ch.key, ok: false, text, fix: { href: "#dates", label: "Change dates" } };
        }
        case "parity": {
          const line = parityLine(ch.summary, longDate(lastDay, c.timezone));
          return {
            key: ch.key,
            ok: line.ok,
            text: line.text,
            fix: line.ok ? undefined : { href: "#entries", label: "Adjust entries" },
          };
        }
        case "stripe":
          return ch.ok
            ? { key: ch.key, ok: true, text: "Stripe connected — donations go to your account" }
            : {
                key: ch.key,
                ok: false,
                text:
                  ch.problem === "charges_disabled"
                    ? "Finish your Stripe setup to offer bonus entries, or turn bonus entries off"
                    : "Connect Stripe to offer bonus entries, or turn bonus entries off",
                fix:
                  ch.problem === "charges_disabled"
                    ? { href: "/admin/stripe/refresh", label: "Finish Stripe setup" }
                    : { href: "/admin", label: "Connect Stripe" },
              };
      }
    });
}
