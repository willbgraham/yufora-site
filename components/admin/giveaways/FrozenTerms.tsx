import { clockTime, lastDay, longDate, money } from "@/lib/giveaways/format";

export default function FrozenTerms({
  giveaway: g,
}: {
  giveaway: {
    prizeName: string;
    prizeArvCents: number;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
    freeEntriesPerDay: number;
    perPersonCap: number;
    donationsEnabled: boolean;
    centsPerEntry: number | null;
    claimDeadlineDays: number;
    sponsorLegalName: string;
    liveAt: Date | null;
  };
}) {
  const tz = g.timezone;
  const rows: [string, string][] = [
    ["Prize", `${g.prizeName} (approx. ${money(g.prizeArvCents)})`],
    ["Entries open", `${longDate(g.startsAt, tz)} at ${clockTime(g.startsAt, tz)}`],
    ["Entries close", `${longDate(lastDay(g.endsAt), tz)} at ${clockTime(lastDay(g.endsAt), tz)}`],
    ["Free entries", g.freeEntriesPerDay === 1 ? "1 a day" : `${g.freeEntriesPerDay} a day`],
    ["Limit per person", `${g.perPersonCap} entries`],
    [
      "Bonus entries",
      g.donationsEnabled && g.centsPerEntry ? `1 per ${money(g.centsPerEntry)} donated` : "Off",
    ],
    ["Claim window", `${g.claimDeadlineDays} days`],
    ["Sponsor", g.sponsorLegalName],
  ];
  return (
    <section aria-labelledby="terms-heading" className="rounded-xl border border-warm-200 bg-white p-6">
      <h2 id="terms-heading" className="text-xl">Terms</h2>
      <p className="mt-1 text-sm text-warm-600">
        Locked at go-live{g.liveAt ? ` on ${longDate(g.liveAt, tz)}` : ""}. These are the terms in your
        Official Rules. Need to change something? Email hello@yufora.com.
      </p>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-warm-600">{k}</dt>
            <dd className="text-warm-900">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
