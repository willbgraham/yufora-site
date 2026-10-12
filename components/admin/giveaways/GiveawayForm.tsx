"use client";

import { useKeepValuesSubmit } from "@/components/forms/useKeepValuesSubmit";
import { useActionState, useMemo, useState } from "react";
import type { GiveawayFormState } from "@/app/actions/giveaways";
import { Button } from "@/components/ui/Button";
import {
  addDaysIso,
  countEntryDays,
  isValidIsoDate,
  zonedMidnight,
} from "@/lib/giveaways/calendar";
import { CLAIM_DAYS_MAX, CLAIM_DAYS_MIN, FREE_ENTRIES_PER_DAY_MAX, US_TIMEZONES } from "@/lib/giveaways/constants";
import { parityLine } from "@/lib/giveaways/display";
import { clockTime, lastDay, longDate, weekdayDate } from "@/lib/giveaways/format";
import { getParitySummary } from "@/lib/giveaways/parity";
import { US_STATES, stateName } from "@/lib/us-states";

const initial: GiveawayFormState = { status: "idle" };

const fieldBase =
  "mt-1.5 w-full rounded-md border border-warm-300 bg-white px-3.5 py-2.5 text-base text-warm-900 placeholder:text-warm-500 focus:border-pink-600 disabled:bg-warm-50";

export type GiveawayFormDefaults = {
  prizeName: string;
  prizeDescription: string;
  prizeArv: string;
  startDate: string;
  endDate: string;
  timezone: string;
  freeEntriesPerDay: string;
  perPersonCap: string;
  donationsEnabled: boolean;
  dollarsPerEntry: string;
  claimDeadlineDays: string;
  sponsorLegalName: string;
  sponsorStreet: string;
  sponsorCity: string;
  sponsorState: string;
  sponsorZip: string;
  sponsorPrivacyUrl: string;
  sitePageUrl: string;
  excludedEmailDomains: string;
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset id={id} className="scroll-mt-24 space-y-5 border-t border-warm-100 pt-6 first:border-0 first:pt-0">
      <legend className="float-left mb-1 w-full font-display text-xl text-warm-900">{title}</legend>
      {children}
    </fieldset>
  );
}

export default function GiveawayForm({
  action,
  defaults,
  nowMs,
}: {
  action: (prev: GiveawayFormState, fd: FormData) => Promise<GiveawayFormState>;
  defaults: GiveawayFormDefaults;
  /** Server render time — keeps the live summary identical on hydration. */
  nowMs: number;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const keepValues = useKeepValuesSubmit(formAction);
  const [v, setV] = useState(defaults);
  const errs = state.fieldErrors ?? {};
  const set =
    (key: keyof GiveawayFormDefaults) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setV((prev) => ({
        ...prev,
        [key]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value,
      }));

  // Live date summary and parity line, computed with the same functions
  // the server uses at go-live.
  const live = useMemo(() => {
    if (!isValidIsoDate(v.startDate) || !isValidIsoDate(v.endDate) || v.endDate < v.startDate) {
      return null;
    }
    const tz = v.timezone;
    const starts = zonedMidnight(v.startDate, tz);
    const ends = zonedMidnight(addDaysIso(v.endDate, 1), tz);
    const from = new Date(Math.max(starts.getTime(), nowMs));
    const days = countEntryDays(from, ends, tz);
    const summary = getParitySummary({
      perPersonCap: Number(v.perPersonCap) || 0,
      freeEntriesPerDay: Number(v.freeEntriesPerDay) || 0,
      entryDays: days,
    });
    const end = lastDay(ends);
    return {
      dates: `Entries open ${weekdayDate(starts, tz)} at ${clockTime(starts, tz)} and close ${weekdayDate(end, tz)} at ${clockTime(end, tz)} (${days} ${days === 1 ? "day" : "days"}).`,
      parity: parityLine(summary, longDate(end, tz)),
    };
  }, [v.startDate, v.endDate, v.timezone, v.perPersonCap, v.freeEntriesPerDay, nowMs]);

  const err = (name: string, hint?: string) =>
    errs[name] ? (
      <p id={`${name}-error`} className="mt-1.5 text-sm text-pink-700">
        {errs[name]}
      </p>
    ) : hint ? (
      <p id={`${name}-hint`} className="mt-1.5 text-sm text-warm-600">
        {hint}
      </p>
    ) : null;
  const aria = (name: string, hint = false) => ({
    "aria-invalid": !!errs[name],
    "aria-describedby": errs[name] ? `${name}-error` : hint ? `${name}-hint` : undefined,
  });

  return (
    <form action={formAction} onSubmit={keepValues} className="space-y-8">
      {state.status === "error" && state.message && (
        <div role="alert" className="rounded-md border border-pink-200 bg-pink-50 p-4 text-sm text-pink-800">
          {state.message}
        </div>
      )}
      {state.status === "idle" && state.message && (
        <p role="status" className="text-sm font-medium text-teal-700">
          {state.message}
        </p>
      )}

      <Section id="prize" title="The prize">
        <div>
          <label htmlFor="prizeName" className="block text-sm font-medium text-warm-900">Prize name</label>
          <input id="prizeName" name="prizeName" value={v.prizeName} onChange={set("prizeName")} required className={fieldBase} {...aria("prizeName")} />
          {err("prizeName")}
        </div>
        <div>
          <label htmlFor="prizeDescription" className="block text-sm font-medium text-warm-900">Prize description</label>
          <textarea id="prizeDescription" name="prizeDescription" rows={4} value={v.prizeDescription} onChange={set("prizeDescription")} className={fieldBase} {...aria("prizeDescription", true)} />
          {err("prizeDescription", "What exactly the winner gets, and what isn't included. This text goes into your Official Rules.")}
        </div>
        <div>
          <label htmlFor="prizeArv" className="block text-sm font-medium text-warm-900">Prize value (USD)</label>
          <input id="prizeArv" name="prizeArv" inputMode="decimal" value={v.prizeArv} onChange={set("prizeArv")} required className={fieldBase} {...aria("prizeArv", true)} />
          {err("prizeArv", "Its approximate retail value. Must be under $5,000.")}
        </div>
      </Section>

      <Section id="dates" title="Dates">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-warm-900">First day</label>
            <input id="startDate" name="startDate" type="date" value={v.startDate} onChange={set("startDate")} required className={fieldBase} {...aria("startDate")} />
            {err("startDate")}
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-warm-900">Last day</label>
            <input id="endDate" name="endDate" type="date" value={v.endDate} onChange={set("endDate")} required className={fieldBase} {...aria("endDate")} />
            {err("endDate")}
          </div>
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-warm-900">Time zone</label>
            <select id="timezone" name="timezone" value={v.timezone} onChange={set("timezone")} className={fieldBase}>
              {US_TIMEZONES.map((z) => (
                <option key={z.value} value={z.value}>{z.label}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm text-warm-700" aria-live="polite">
          {live ? live.dates : "Pick the first and last days people can enter."}
        </p>
        <p className="text-sm text-warm-600">
          Up to 90 days. If you go live after the first day, entries open the moment you go live.
        </p>
      </Section>

      <Section id="entries" title="Entries">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="freeEntriesPerDay" className="block text-sm font-medium text-warm-900">Free entries per day</label>
            <input id="freeEntriesPerDay" name="freeEntriesPerDay" inputMode="numeric" value={v.freeEntriesPerDay} onChange={set("freeEntriesPerDay")} className={fieldBase} {...aria("freeEntriesPerDay", true)} />
            {err("freeEntriesPerDay", `From 1 to ${FREE_ENTRIES_PER_DAY_MAX}.`)}
          </div>
          <div>
            <label htmlFor="perPersonCap" className="block text-sm font-medium text-warm-900">Entry limit per person</label>
            <input id="perPersonCap" name="perPersonCap" inputMode="numeric" value={v.perPersonCap} onChange={set("perPersonCap")} className={fieldBase} {...aria("perPersonCap", true)} />
            {err("perPersonCap", "The most entries one person can have, free and bonus combined.")}
          </div>
        </div>
        {live && (
          <p className={`rounded-md p-3 text-sm ${live.parity.ok ? "bg-teal-50 text-teal-900" : "bg-pink-50 text-pink-800"}`} aria-live="polite">
            <span aria-hidden="true">{live.parity.ok ? "✓ " : "✗ "}</span>
            {live.parity.text}
          </p>
        )}
        <label className="flex items-start gap-3 text-sm text-warm-800">
          <input type="checkbox" name="donationsEnabled" checked={v.donationsEnabled} onChange={set("donationsEnabled")} className="mt-0.5 size-5 shrink-0 accent-pink-600" />
          <span>
            <span className="font-medium text-warm-900">Offer bonus entries for donations</span>
            <span className="block text-warm-600">Gifts go straight to your Stripe account. Everyone can still reach the same limit free.</span>
          </span>
        </label>
        {v.donationsEnabled && (
          <div className="max-w-xs">
            <label htmlFor="dollarsPerEntry" className="block text-sm font-medium text-warm-900">Dollars per bonus entry</label>
            <input id="dollarsPerEntry" name="dollarsPerEntry" inputMode="numeric" value={v.dollarsPerEntry} onChange={set("dollarsPerEntry")} className={fieldBase} {...aria("dollarsPerEntry", true)} />
            {err("dollarsPerEntry", "Whole dollars, $5 or more. $10 means a $50 gift adds 5 bonus entries.")}
          </div>
        )}
      </Section>

      <Section id="claim" title="Claiming the prize">
        <div className="max-w-xs">
          <label htmlFor="claimDeadlineDays" className="block text-sm font-medium text-warm-900">Days the winner has to accept</label>
          <input id="claimDeadlineDays" name="claimDeadlineDays" inputMode="numeric" value={v.claimDeadlineDays} onChange={set("claimDeadlineDays")} className={fieldBase} {...aria("claimDeadlineDays", true)} />
          {err("claimDeadlineDays", `${CLAIM_DAYS_MIN}–${CLAIM_DAYS_MAX} days. If they don't accept in time, the prize passes to the next of three alternates.`)}
        </div>
      </Section>

      <Section id="sponsor" title="Your organization (the Sponsor)">
        <div>
          <label htmlFor="sponsorLegalName" className="block text-sm font-medium text-warm-900">Legal name</label>
          <input id="sponsorLegalName" name="sponsorLegalName" value={v.sponsorLegalName} onChange={set("sponsorLegalName")} className={fieldBase} {...aria("sponsorLegalName", true)} />
          {err("sponsorLegalName", "Exactly as registered, e.g. “Riverside Animal Rescue, Inc.”")}
        </div>
        <div>
          <label htmlFor="sponsorStreet" className="block text-sm font-medium text-warm-900">Mailing address</label>
          <input id="sponsorStreet" name="sponsorStreet" autoComplete="street-address" value={v.sponsorStreet} onChange={set("sponsorStreet")} className={fieldBase} {...aria("sponsorStreet")} />
          {err("sponsorStreet")}
        </div>
        <div className="grid gap-5 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <label htmlFor="sponsorCity" className="block text-sm font-medium text-warm-900">City</label>
            <input id="sponsorCity" name="sponsorCity" value={v.sponsorCity} onChange={set("sponsorCity")} className={fieldBase} {...aria("sponsorCity")} />
            {err("sponsorCity")}
          </div>
          <div>
            <label htmlFor="sponsorState" className="block text-sm font-medium text-warm-900">State</label>
            <select id="sponsorState" name="sponsorState" value={v.sponsorState} onChange={set("sponsorState")} className={fieldBase} {...aria("sponsorState")}>
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.code}</option>
              ))}
            </select>
            {err("sponsorState")}
          </div>
          <div>
            <label htmlFor="sponsorZip" className="block text-sm font-medium text-warm-900">ZIP</label>
            <input id="sponsorZip" name="sponsorZip" inputMode="numeric" autoComplete="postal-code" value={v.sponsorZip} onChange={set("sponsorZip")} className={fieldBase} {...aria("sponsorZip")} />
            {err("sponsorZip")}
          </div>
        </div>
        {v.sponsorState && (
          <p className="text-sm text-warm-600">Your Official Rules will be governed by {stateName(v.sponsorState)} law.</p>
        )}
        <div>
          <label htmlFor="sponsorPrivacyUrl" className="block text-sm font-medium text-warm-900">
            Your privacy policy <span className="font-normal text-warm-600">(optional)</span>
          </label>
          <input id="sponsorPrivacyUrl" name="sponsorPrivacyUrl" type="url" placeholder="https://" value={v.sponsorPrivacyUrl} onChange={set("sponsorPrivacyUrl")} className={fieldBase} {...aria("sponsorPrivacyUrl")} />
          {err("sponsorPrivacyUrl")}
        </div>
        <div>
          <label htmlFor="excludedEmailDomains" className="block text-sm font-medium text-warm-900">
            Staff email domains <span className="font-normal text-warm-600">(optional)</span>
          </label>
          <input id="excludedEmailDomains" name="excludedEmailDomains" placeholder="yourorg.org" value={v.excludedEmailDomains} onChange={set("excludedEmailDomains")} className={fieldBase} {...aria("excludedEmailDomains", true)} />
          {err("excludedEmailDomains", "Your staff, officers and board can't enter. Addresses at these domains are turned away.")}
        </div>
      </Section>

      <Section id="site" title="Where it appears">
        <div>
          <label htmlFor="sitePageUrl" className="block text-sm font-medium text-warm-900">
            The page on your website <span className="font-normal text-warm-600">(optional)</span>
          </label>
          <input id="sitePageUrl" name="sitePageUrl" type="url" placeholder="https://yourorg.org/giveaway" value={v.sitePageUrl} onChange={set("sitePageUrl")} className={fieldBase} {...aria("sitePageUrl", true)} />
          {err("sitePageUrl", "Where you'll paste the entry form. Used for “Back to” links.")}
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-6 border-t border-warm-100 bg-white/95 px-6 py-4 sm:-mx-8 sm:px-8">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
