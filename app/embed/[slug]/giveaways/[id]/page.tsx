import GiveawayCard, { cardStateFor } from "@/components/giveaways/GiveawayCard";
import {
  getPublicGiveaway,
  getPublicWinnerName,
  issueEntryFormToken,
} from "@/lib/data/giveaways";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; id: string }> };

/**
 * The entry card inside the charity's own site. Never a donate button
 * here: bonus entries attach to a confirmed entrant, and a cookieless
 * iframe can't know who that is — the donation lives on the entrant's
 * personal page, reached from their email.
 */
export default async function EmbedGiveawayPage({ params }: Props) {
  const { slug, id } = await params;
  const data = await getPublicGiveaway(slug, id);
  // Never 404 inside the charity's own website.
  if (!data) {
    return (
      <p className="rounded-xl border border-dashed border-warm-300 p-8 text-center text-warm-600">
        This giveaway isn&rsquo;t open yet — check back soon.
      </p>
    );
  }
  const { giveaway: g, charity } = data;
  const now = new Date();
  const state = cardStateFor(g, now);
  const base = `/s/${charity.slug}/giveaways/${g.id}`;
  return (
    <GiveawayCard
      giveaway={g}
      charityName={charity.name}
      now={now}
      state={state}
      context="embed"
      formToken={state === "live" ? await issueEntryFormToken(g.id) : null}
      winnerName={state === "drawn" ? await getPublicWinnerName(g.id) : null}
      rulesHref={`${base}/rules`}
      verifyHref={`${base}/verify`}
    />
  );
}
