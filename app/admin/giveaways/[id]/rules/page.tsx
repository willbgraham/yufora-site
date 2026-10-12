import Link from "next/link";
import { notFound } from "next/navigation";
import OfficialRules from "@/components/giveaways/OfficialRules";
import PrintButton from "@/components/giveaways/PrintButton";
import { getFrozenRulesForCharity, getGiveawayForCharity } from "@/lib/data/giveaways";
import { requireGiveawayAdmin } from "@/lib/giveaways/admin-access";
import { isGiveawaysGoLiveOpen } from "@/lib/giveaways/flags";
import { renderRules, rulesPlaceholders, rulesToText } from "@/lib/giveaways/rules-template";
import { siteConfig } from "@/lib/site";

export const metadata = { title: "Official Rules preview" };

/**
 * Drafts: the Rules rendered by the SAME function go-live uses, from the
 * current settings. Live giveaways: the frozen document.
 */
export default async function AdminRulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { charity } = await requireGiveawayAdmin();
  const g = await getGiveawayForCharity(id, charity.id);
  if (!g) notFound();

  const doc =
    g.status === "draft"
      ? renderRules({
      ...g,
      startsAt: new Date(Math.max(g.startsAt.getTime(), new Date().getTime())),
      campaignId: g.id,
      charityName: charity.name,
      charitySlug: charity.slug,
      origin: siteConfig.url,
      seedCommit: null,
    })
      : await getFrozenRulesForCharity(g.id, charity.id);
  if (!doc) notFound();
  const holes = g.status === "draft" ? rulesPlaceholders(rulesToText(doc)) : [];
  const unreviewed = !isGiveawaysGoLiveOpen();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/admin/giveaways/${g.id}`} className="text-sm text-warm-600 hover:text-pink-700">
          ← Back to the giveaway
        </Link>
        <PrintButton />
      </div>
      {g.status === "draft" && (
        <div className="mt-4 space-y-3">
          {unreviewed && (
            <p className="rounded-lg border-2 border-pink-300 bg-pink-50 p-4 text-sm font-semibold uppercase tracking-wide text-pink-800">
              Draft template — pending review by a promotions lawyer. Not for use.
            </p>
          )}
          <p className="rounded-lg border border-warm-200 bg-white p-4 text-sm text-warm-700">
            This preview updates as you edit your giveaway. At go-live these Rules
            are locked, and a fingerprint of the draw is added to section 8.
            {holes.length > 0 && (
              <>
                {" "}Still to fill in: <strong className="text-warm-900">{holes.join(", ")}</strong>.
              </>
            )}
          </p>
        </div>
      )}
      <div className="mt-6 rounded-xl border border-warm-200 bg-white p-6 sm:p-10">
        <OfficialRules document={doc} />
      </div>
    </div>
  );
}
