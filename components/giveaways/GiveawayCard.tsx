import Image from "next/image";
import EntryForm from "@/components/giveaways/EntryForm";
import NoDonationNecessary from "@/components/giveaways/NoDonationNecessary";
import { countEntryDays } from "@/lib/giveaways/calendar";
import { giveawayPhase } from "@/lib/giveaways/entries";
import { clockTime, dateTime, lastDay, longDate, money, shortDate } from "@/lib/giveaways/format";
import { bonusNote, cardFooter } from "@/lib/giveaways/legal-copy";

export type CardState = "upcoming" | "live" | "ended" | "drawn" | "canceled";

export type CardGiveaway = {
  status: string;
  prizeName: string;
  prizeArvCents: number;
  prizePhotoUrl: string | null;
  timezone: string;
  startsAt: Date;
  endsAt: Date;
  drawAt: Date;
  perPersonCap: number;
  donationsEnabled: boolean;
  centsPerEntry: number | null;
  sponsorLegalName: string;
};

export function cardStateFor(g: CardGiveaway, now: Date): CardState {
  const phase = giveawayPhase(g, now);
  switch (phase) {
    case "scheduled":
      return "upcoming";
    case "draft":
    case "open":
      return "live";
    case "drawn":
    case "completed":
      return "drawn";
    case "canceled":
      return "canceled";
    default:
      return "ended";
  }
}

/**
 * The giveaway as entrants see it. One component for the hosted page, the
 * embed, the marketing demo and the admin preview; container queries let
 * it fit a 300px iframe and a full page alike.
 */
export default function GiveawayCard({
  giveaway: g,
  charityName,
  now,
  state = cardStateFor(g, now),
  context,
  headingLevel = "h2",
  formToken = null,
  winnerName = null,
  rulesHref,
  verifyHref,
}: {
  giveaway: CardGiveaway;
  charityName: string;
  now: Date;
  state?: CardState;
  context: "hosted" | "embed" | "demo" | "preview";
  headingLevel?: "h1" | "h2";
  formToken?: string | null;
  winnerName?: string | null;
  rulesHref: string;
  verifyHref: string;
}) {
  const Heading = headingLevel;
  const tz = g.timezone;
  const end = lastDay(g.endsAt);
  const daysLeft = countEntryDays(now, g.endsAt, tz);
  const interactive = context === "hosted" || context === "embed";

  return (
    <article className="@container overflow-hidden rounded-xl border border-warm-200 bg-white">
      <div className="grid @2xl:grid-cols-2">
        <div className="relative aspect-[4/3] bg-warm-100">
          {g.prizePhotoUrl ? (
            <Image
              src={g.prizePhotoUrl}
              alt={g.prizeName}
              fill
              priority={context === "hosted"}
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center font-display text-2xl text-warm-500">
              {g.prizeName}
            </div>
          )}
        </div>

        <div className="p-5 @md:p-7">
          <p className="text-sm font-medium uppercase tracking-wide text-pink-700">
            Giveaway · {charityName}
          </p>
          <Heading className="mt-1.5 text-2xl leading-tight text-warm-900 @md:text-3xl">
            {g.prizeName}
          </Heading>
          <p className="mt-2 text-warm-700">
            Approx. value {money(g.prizeArvCents)}
            {state === "live" || state === "upcoming" ? " · Enter free for a chance to win" : ""}
          </p>

          {state === "live" && (
            <p className="mt-1 text-sm text-warm-600">
              Ends <time dateTime={g.endsAt.toISOString()}>{shortDate(end, tz)} at {clockTime(end, tz)}</time>
              {" · "}
              {daysLeft <= 1 ? "last day" : `${daysLeft} days left`}
            </p>
          )}

          <div className="mt-5">
            {state === "live" && (
              <EntryForm
                formToken={formToken}
                charityName={charityName}
                rulesHref={rulesHref}
                disabled={!interactive}
              />
            )}
            {state === "upcoming" && (
              <p className="rounded-lg bg-warm-50 p-4 text-warm-800">
                Opens <time dateTime={g.startsAt.toISOString()}>{dateTime(g.startsAt, tz)}</time>.
                Check back then to enter free.
              </p>
            )}
            {state === "ended" && (
              <div className="rounded-lg bg-warm-50 p-4 text-warm-800">
                <p>
                  Entries closed {longDate(end, tz)}. The winner will be drawn soon and
                  contacted by email.
                </p>
                <a href={verifyHref} className="mt-2 inline-block font-medium text-pink-700 hover:underline">
                  How the winner is chosen →
                </a>
              </div>
            )}
            {state === "drawn" && (
              <div className="rounded-lg bg-teal-50 p-4 text-warm-800">
                <p className="font-medium text-teal-900">
                  {winnerName
                    ? `Winner: ${winnerName}`
                    : "A winner has been drawn and is being contacted."}
                </p>
                <a href={verifyHref} className="mt-2 inline-block font-medium text-pink-700 hover:underline">
                  See how the winner was chosen →
                </a>
              </div>
            )}
            {state === "canceled" && (
              <p className="rounded-lg bg-warm-50 p-4 text-warm-800">This giveaway was canceled.</p>
            )}
          </div>

          {state === "live" && g.donationsEnabled && g.centsPerEntry && (
            <div className="mt-5 border-t border-warm-100 pt-4">
              <p className="text-sm text-warm-700">
                {bonusNote({
                  charityName,
                  dollarsPerEntry: money(g.centsPerEntry),
                  cap: g.perPersonCap,
                })}
              </p>
              <NoDonationNecessary className="mt-1.5" />
            </div>
          )}

          <p className="mt-5 text-sm text-warm-600">
            {cardFooter(g.sponsorLegalName)}{" "}
            <a
              href={rulesHref}
              target="_blank"
              rel="noopener"
              className="font-medium text-pink-700 underline"
            >
              Official Rules
            </a>
          </p>
        </div>
      </div>
    </article>
  );
}
