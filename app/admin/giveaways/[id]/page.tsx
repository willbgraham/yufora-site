import Link from "next/link";
import { notFound } from "next/navigation";
import { updateGiveaway } from "@/app/actions/giveaways";
import EmbedSnippet from "@/components/admin/EmbedSnippet";
import { CancelGiveawayForm, DeleteDraftButton } from "@/components/admin/giveaways/DraftControls";
import DrawPanel from "@/components/admin/giveaways/DrawPanel";
import EntrantsTable from "@/components/admin/giveaways/EntrantsTable";
import FrozenTerms from "@/components/admin/giveaways/FrozenTerms";
import GiveawayForm from "@/components/admin/giveaways/GiveawayForm";
import GiveawayStats from "@/components/admin/giveaways/GiveawayStats";
import GiveawayStatusChip from "@/components/admin/giveaways/GiveawayStatusChip";
import GoLiveChecklist from "@/components/admin/giveaways/GoLiveChecklist";
import PrizePhotoField from "@/components/admin/giveaways/PrizePhotoField";
import WinnerPanel from "@/components/admin/giveaways/WinnerPanel";
import { getEntitlementsForCharity } from "@/lib/billing";
import {
  getClaimsForCampaign,
  getDrawView,
  getGiveawayForCharity,
  getGiveawayStats,
  getLatestEntrants,
} from "@/lib/data/giveaways";
import { requireGiveawayAdmin } from "@/lib/giveaways/admin-access";
import { addDaysIso, lastEntryIsoDate, localIsoDate, zonedMidnight } from "@/lib/giveaways/calendar";
import { DRAW_WITHIN_DAYS } from "@/lib/giveaways/constants";
import { displayStatus } from "@/lib/giveaways/display";
import { isGiveawaysGoLiveOpen } from "@/lib/giveaways/flags";
import { dateTime, lastDay, longDate } from "@/lib/giveaways/format";
import { validateForGoLive } from "@/lib/giveaways/validation";
import { siteConfig } from "@/lib/site";
import { isStripeConfigured } from "@/lib/stripe";

/** The draw action runs in this segment and may wait ~40s for drand. */
export const maxDuration = 60;

export const metadata = { title: "Giveaway" };

/** Bonus entries for donations arrive in the next phase. */
const DONATIONS_AVAILABLE = false;

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-warm-200 bg-white p-6">{children}</section>;
}

export default async function GiveawayWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { charity } = await requireGiveawayAdmin();
  const g = await getGiveawayForCharity(id, charity.id);
  if (!g) notFound();

  const now = new Date();
  const status = displayStatus(g, now);
  const tz = g.timezone;
  const publicBase = `/s/${charity.slug}/giveaways/${g.id}`;
  const isDraft = g.status === "draft";

  const [stats, entrants, claims, draw] = isDraft
    ? [null, [], [], { stage: "none" as const }]
    : await Promise.all([
        getGiveawayStats(g.id),
        getLatestEntrants(g.id),
        getClaimsForCampaign(g.id),
        getDrawView(g.id),
      ]);

  const snippet = `<script src="${siteConfig.url}/embed.js" data-shop="${charity.slug}" data-widget="giveaway" data-giveaway="${g.id}" async></script>`;

  let checklist = null;
  if (isDraft) {
    const entitlements = await getEntitlementsForCharity(charity);
    const goLiveOpen = isGiveawaysGoLiveOpen();
    const check = validateForGoLive(g, {
      now,
      goLiveOpen,
      entitled: entitlements.giveaways,
      stripe: {
        configured: isStripeConfigured(),
        accountId: charity.stripeAccountId,
        chargesEnabled: charity.stripeChargesEnabled,
      },
    });
    checklist = (
      <GoLiveChecklist campaignId={g.id} checks={check.checks} giveaway={g} goLiveOpen={goLiveOpen} now={now} />
    );
  }

  const drawBy = longDate(zonedMidnight(addDaysIso(lastEntryIsoDate(g.endsAt, tz), DRAW_WITHIN_DAYS), tz), tz);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/giveaways" className="text-sm text-warm-600 hover:text-pink-700">
          ← Giveaways
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">{g.prizeName}</h1>
          <GiveawayStatusChip giveaway={g} now={now} />
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href={`/admin/giveaways/${g.id}/preview`} className="font-medium text-pink-700 hover:underline">
            Preview ↗
          </Link>
          <Link
            href={isDraft ? `/admin/giveaways/${g.id}/rules` : `${publicBase}/rules`}
            className="font-medium text-pink-700 hover:underline"
          >
            Official Rules ↗
          </Link>
          {!isDraft && (
            <>
              <Link href={publicBase} className="font-medium text-pink-700 hover:underline">
                Giveaway page ↗
              </Link>
              <Link href={`${publicBase}/verify`} className="font-medium text-pink-700 hover:underline">
                Results page ↗
              </Link>
            </>
          )}
        </p>
      </div>

      {isDraft && (
        <>
          {checklist}
          <Card>
            <h2 className="text-xl">Prize photo</h2>
            <div className="mt-4">
              <PrizePhotoField campaignId={g.id} photoUrl={g.prizePhotoUrl} prizeName={g.prizeName} />
            </div>
          </Card>
          <section className="rounded-xl border border-warm-200 bg-white p-6 sm:p-8">
            <GiveawayForm
              action={updateGiveaway.bind(null, g.id)}
              donationsAvailable={DONATIONS_AVAILABLE}
              nowMs={now.getTime()}
              defaults={{
                prizeName: g.prizeName,
                prizeDescription: g.prizeDescription,
                prizeArv: (g.prizeArvCents / 100).toString(),
                startDate: localIsoDate(g.startsAt, tz),
                endDate: lastEntryIsoDate(g.endsAt, tz),
                timezone: tz,
                freeEntriesPerDay: String(g.freeEntriesPerDay),
                perPersonCap: String(g.perPersonCap),
                donationsEnabled: g.donationsEnabled,
                dollarsPerEntry: g.centsPerEntry ? String(g.centsPerEntry / 100) : "10",
                claimDeadlineDays: String(g.claimDeadlineDays),
                sponsorLegalName: g.sponsorLegalName,
                sponsorStreet: g.sponsorStreet,
                sponsorCity: g.sponsorCity,
                sponsorState: g.sponsorState,
                sponsorZip: g.sponsorZip,
                sponsorPrivacyUrl: g.sponsorPrivacyUrl ?? "",
                sitePageUrl: g.sitePageUrl ?? "",
                excludedEmailDomains: g.excludedEmailDomains,
              }}
            />
          </section>
          <Card>
            <h2 className="text-xl">Put it on your site</h2>
            <p className="mt-1 text-sm text-warm-600">
              Paste this where the entry form should appear. It shows &ldquo;not open
              yet&rdquo; until you go live, so it&rsquo;s safe to add now.
            </p>
            <div className="mt-4">
              <EmbedSnippet snippet={snippet} />
            </div>
          </Card>
          <div className="flex justify-end">
            <DeleteDraftButton campaignId={g.id} />
          </div>
        </>
      )}

      {(status === "closed" || status === "drawing") && stats && (
        <DrawPanel
          campaignId={g.id}
          canDraw={now >= g.drawAt}
          drawing={status === "drawing"}
          summary={
            now < g.drawAt ? (
              <p>
                Entries closed {longDate(lastDay(g.endsAt), tz)}. People have 24 hours to
                confirm their email, so you can draw the winner from {dateTime(g.drawAt, tz)}.
              </p>
            ) : (
              <p>
                Entries closed {longDate(lastDay(g.endsAt), tz)}. {stats.confirmed} people are
                eligible, with {stats.freeEntries + stats.bonusEntries} entries.
                {stats.unconfirmed > 0 &&
                  ` ${stats.unconfirmed} never confirmed their email, so their entries don't count.`}{" "}
                Your Official Rules say the winner is drawn by {drawBy}.
              </p>
            )
          }
        />
      )}

      {(status === "drawn" || status === "complete") && claims.length > 0 && draw.stage === "complete" && (
        <WinnerPanel
          campaignId={g.id}
          claims={claims}
          alternatesDrawn={draw.published.results.length - 1}
          giveaway={g}
          now={now}
        />
      )}
      {status === "complete" && g.outcome === "no_entries" && (
        <Card>
          <p className="text-warm-800">No one confirmed an entry, so there was no winner to draw.</p>
        </Card>
      )}
      {status === "canceled" && (
        <Card>
          <p className="text-warm-800">This giveaway was canceled.</p>
        </Card>
      )}

      {!isDraft && stats && <GiveawayStats stats={stats} giveaway={g} now={now} />}

      {(status === "scheduled" || status === "live") && (
        <Card>
          <h2 className="text-xl">Share it</h2>
          <p className="mt-2 text-sm text-warm-700">
            Link:{" "}
            <a href={publicBase} className="break-all font-mono text-pink-700 hover:underline">
              {siteConfig.url.replace(/^https?:\/\//, "")}
              {publicBase}
            </a>
          </p>
          <div className="mt-4">
            <EmbedSnippet snippet={snippet} />
          </div>
        </Card>
      )}

      {!isDraft && (
        <EntrantsTable rows={entrants} timezone={tz} exportHref={`/admin/giveaways/${g.id}/export`} />
      )}
      {!isDraft && <FrozenTerms giveaway={g} />}
      {(status === "scheduled" || status === "live") && (
        <div className="flex justify-end">
          <CancelGiveawayForm campaignId={g.id} />
        </div>
      )}
    </div>
  );
}
