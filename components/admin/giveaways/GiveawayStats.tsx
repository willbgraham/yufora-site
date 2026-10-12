import { countEntryDays } from "@/lib/giveaways/calendar";
import { lastDay, money, shortDate } from "@/lib/giveaways/format";

type Stats = {
  confirmed: number;
  unconfirmed: number;
  optedIn: number;
  freeEntries: number;
  bonusEntries: number;
  raisedCents: number;
  gifts: number;
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-warm-200 bg-white p-4">
      <p className="text-sm text-warm-600">{label}</p>
      <p className="mt-1 text-2xl font-medium text-warm-900">{value}</p>
      {sub && <p className="mt-0.5 text-sm text-warm-600">{sub}</p>}
    </div>
  );
}

export default function GiveawayStats({
  stats,
  giveaway,
  now,
}: {
  stats: Stats;
  giveaway: { startsAt: Date; endsAt: Date; timezone: string; donationsEnabled: boolean };
  now: Date;
}) {
  const tz = giveaway.timezone;
  const timeLeft =
    now < giveaway.startsAt
      ? { value: `Opens ${shortDate(giveaway.startsAt, tz)}` }
      : now < giveaway.endsAt
        ? { value: `${countEntryDays(now, giveaway.endsAt, tz)} days`, sub: "left to enter" }
        : { value: "Ended", sub: shortDate(lastDay(giveaway.endsAt), tz, true) };
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat
        label="Entrants"
        value={stats.confirmed.toLocaleString("en-US")}
        sub={`confirmed · ${stats.unconfirmed} waiting`}
      />
      <Stat
        label="Entries"
        value={(stats.freeEntries + stats.bonusEntries).toLocaleString("en-US")}
        sub={giveaway.donationsEnabled ? `${stats.freeEntries} free · ${stats.bonusEntries} bonus` : "all free"}
      />
      {giveaway.donationsEnabled ? (
        <Stat label="Raised through bonus entries" value={money(stats.raisedCents)} sub={`${stats.gifts} gifts`} />
      ) : (
        <Stat label="Joined your list" value={stats.optedIn.toLocaleString("en-US")} />
      )}
      <Stat label="Time left" value={timeLeft.value} sub={timeLeft.sub} />
    </div>
  );
}
