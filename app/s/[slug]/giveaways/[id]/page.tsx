import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Container from "@/components/layout/Container";
import GiveawayCard, { cardStateFor } from "@/components/giveaways/GiveawayCard";
import {
  getPublicGiveaway,
  getPublicWinnerName,
  issueEntryFormToken,
} from "@/lib/data/giveaways";

// Status depends on the clock, and the entry form carries a token minted
// per render — never serve this from a cache.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const data = await getPublicGiveaway(slug, id);
  if (!data) return {};
  const { giveaway: g, charity } = data;
  return {
    title: `${g.prizeName} — ${charity.name} giveaway`,
    description: `Enter free for a chance to win ${g.prizeName}. No donation necessary.`,
    openGraph: g.prizePhotoUrl ? { images: [{ url: g.prizePhotoUrl }] } : undefined,
  };
}

export default async function HostedGiveawayPage({ params }: Props) {
  const { slug, id } = await params;
  const data = await getPublicGiveaway(slug, id);
  if (!data) notFound();
  const { giveaway: g, charity } = data;
  const now = new Date();
  const state = cardStateFor(g, now);
  const base = `/s/${charity.slug}/giveaways/${g.id}`;
  const back = g.sitePageUrl ?? charity.embedPageUrl;

  return (
    <Container className="max-w-5xl py-10 sm:py-14">
      {back && (
        <a href={back} rel="noreferrer" className="text-sm text-warm-600 hover:text-pink-700">
          ← {charity.name}
        </a>
      )}
      <div className="mt-4">
        <GiveawayCard
          giveaway={g}
          charityName={charity.name}
          now={now}
          state={state}
          context="hosted"
          headingLevel="h1"
          formToken={state === "live" ? await issueEntryFormToken(g.id) : null}
          winnerName={state === "drawn" ? await getPublicWinnerName(g.id) : null}
          rulesHref={`${base}/rules`}
          verifyHref={`${base}/verify`}
        />
      </div>

      {g.prizeDescription && (
        <section aria-labelledby="prize-heading" className="mx-auto mt-10 max-w-2xl">
          <h2 id="prize-heading" className="text-2xl">
            About the prize
          </h2>
          <p className="mt-3 whitespace-pre-line text-warm-800">{g.prizeDescription}</p>
        </section>
      )}

      <p className="mx-auto mt-10 max-w-2xl text-sm text-warm-600">
        <a href={`${base}/rules`} className="font-medium text-pink-700 hover:underline">
          Official Rules
        </a>
        {" · "}
        <a href={`${base}/verify`} className="font-medium text-pink-700 hover:underline">
          How the winner is chosen
        </a>
      </p>
    </Container>
  );
}
