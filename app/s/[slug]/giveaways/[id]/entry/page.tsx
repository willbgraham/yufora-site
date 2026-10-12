import type { Metadata } from "next";
import Link from "next/link";
import {
  claimGiveawayDailyEntry,
  confirmGiveawayEntry,
} from "@/app/actions/giveaway-entry";
import Container from "@/components/layout/Container";
import EntryMethodCard from "@/components/giveaways/EntryMethodCard";
import TokenButton from "@/components/giveaways/TokenButton";
import { getEntrantView } from "@/lib/data/giveaways";
import { giveawayPhase } from "@/lib/giveaways/entries";
import { clockTime, inlinePrize, lastDay, longDate, money } from "@/lib/giveaways/format";
import { EQUAL_WEIGHT } from "@/lib/giveaways/legal-copy";

// Personal links: never indexed, never leaked as a Referer.
export const metadata: Metadata = {
  title: "Your giveaway entry",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ t?: string; donated?: string }>;
};

function Shell({ children, back }: { children: React.ReactNode; back?: string }) {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      {back && (
        <Link href={back} className="text-sm text-warm-600 hover:text-pink-700">
          ← Back to the giveaway
        </Link>
      )}
      <div className="mt-4">{children}</div>
    </Container>
  );
}

export default async function EntrantPage({ params, searchParams }: Props) {
  const { slug, id } = await params;
  const { t, donated } = await searchParams;
  const now = new Date();
  const view = await getEntrantView(t ?? null, now);
  const base = `/s/${slug}/giveaways/${id}`;
  const path = `${base}/entry`;

  if (!view || view.charity.slug !== slug || view.giveaway.id !== id) {
    return (
      <Shell back={base}>
        <h1 className="text-3xl">This link doesn&rsquo;t work anymore.</h1>
        <p className="mt-3 text-warm-700">
          If you entered, check your email for the latest link — or enter again
          on the giveaway page.
        </p>
      </Shell>
    );
  }

  const { giveaway: g, entrant, totals } = view;
  const token = t as string;
  const tz = g.timezone;
  const phase = giveawayPhase(g, now);

  if (!entrant.confirmed) {
    return (
      <Shell back={base}>
        <h1 className="text-3xl">Confirm your entry</h1>
        <p className="mt-3 text-warm-700">
          {view.charity.name}&rsquo;s giveaway for <strong>{inlinePrize(g.prizeName)}</strong>{" "}
          (approx. value {money(g.prizeArvCents)}). Your entry counts once you confirm.
        </p>
        <div className="mt-6 max-w-sm">
          <TokenButton action={confirmGiveawayEntry} token={token} path={path} label="Confirm my entry" />
        </div>
        <p className="mt-4 text-sm text-warm-600">
          If you didn&rsquo;t enter, you can close this page — nothing happens without this click.
        </p>
      </Shell>
    );
  }

  const ended = phase !== "open" && phase !== "scheduled";
  const atCap = view.remaining === 0;

  return (
    <Shell back={base}>
      {donated === "1" && (
        <p role="status" className="mb-6 rounded-lg border border-teal-100 bg-teal-50 p-4 text-teal-900">
          Thank you! Your bonus entries will appear in a moment, and your receipt
          is on its way by email.
        </p>
      )}
      <h1 className="text-3xl">
        {ended
          ? `You had ${totals.active} ${totals.active === 1 ? "entry" : "entries"}.`
          : `You're in — ${totals.active} ${totals.active === 1 ? "entry" : "entries"}.`}
      </h1>
      <p className="mt-2 text-warm-700">
        {view.charity.name}&rsquo;s giveaway for {inlinePrize(g.prizeName)}.{" "}
        {ended ? (
          <>
            Entries closed {longDate(lastDay(g.endsAt), tz)}.{" "}
            <Link href={`${base}/verify`} className="font-medium text-pink-700 hover:underline">
              See how the winner is chosen →
            </Link>
          </>
        ) : (
          "Keep the email we sent: the link in it is how you come back for each day's free entry."
        )}
      </p>

      {!ended && !entrant.active && (
        <p className="mt-6 rounded-lg bg-warm-50 p-4 text-warm-800">
          This entry can&rsquo;t take part in the giveaway. Questions? Reply to the
          email we sent you.
        </p>
      )}

      {!ended && entrant.active && (
        <>
          {atCap ? (
            <p className="mt-6 rounded-lg bg-teal-50 p-4 text-teal-900">
              You&rsquo;ve reached the {g.perPersonCap}-entry limit. Thanks for playing!
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <EntryMethodCard title="Free entry">
                <p>
                  Come back {g.freeEntriesPerDay === 1 ? "once a day" : `${g.freeEntriesPerDay} times a day`}{" "}
                  for another free entry.
                </p>
                <div className="mt-auto">
                  {view.claimedToday ? (
                    <p className="rounded-md bg-warm-50 p-3 text-sm text-warm-800">
                      Today&rsquo;s free entry is in. The next one opens at{" "}
                      {clockTime(view.nextFreeAt, tz)}.
                    </p>
                  ) : (
                    <TokenButton
                      action={claimGiveawayDailyEntry}
                      token={token}
                      path={path}
                      label="Add today's free entry"
                    />
                  )}
                </div>
              </EntryMethodCard>
              {g.donationsEnabled && g.centsPerEntry && (
                <EntryMethodCard title="Bonus entries with a donation">
                  <p>
                    Bonus entries open soon. Free entries count exactly the same.
                  </p>
                </EntryMethodCard>
              )}
            </div>
          )}
          <p className="mt-4 text-sm text-warm-700">
            {g.donationsEnabled ? `${EQUAL_WEIGHT} ` : ""}You have {totals.active} of{" "}
            {g.perPersonCap} possible entries.
          </p>
        </>
      )}

      {view.entryIds.length > 0 && (
        <details className="mt-10 text-sm text-warm-700">
          <summary className="cursor-pointer font-medium text-warm-900">Your entry numbers</summary>
          <p className="mt-2">
            After entries lock, you can find these in the public entry list on the results page.
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            {view.entryIds.map((e) => (
              <li key={e} className="break-all">
                {e}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Shell>
  );
}
