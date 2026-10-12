import Link from "next/link";
import { notFound } from "next/navigation";
import GiveawayCard, { type CardState } from "@/components/giveaways/GiveawayCard";
import { getGiveawayForCharity } from "@/lib/data/giveaways";
import { requireGiveawayAdmin } from "@/lib/giveaways/admin-access";

export const metadata = { title: "Giveaway preview" };

const STATES: { key: CardState; label: string }[] = [
  { key: "live", label: "Open for entries" },
  { key: "upcoming", label: "Not open yet" },
  { key: "ended", label: "Ended" },
  { key: "drawn", label: "Winner drawn" },
];

/** The real card in every state, at phone and site widths — the QA page. */
export default async function GiveawayPreview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const { id } = await params;
  const { state } = await searchParams;
  const { charity } = await requireGiveawayAdmin();
  const g = await getGiveawayForCharity(id, charity.id);
  if (!g) notFound();
  const current = STATES.find((s) => s.key === state)?.key ?? "live";
  const rulesHref = g.status === "draft" ? `/admin/giveaways/${g.id}/rules` : `/s/${charity.slug}/giveaways/${g.id}/rules`;
  const card = (
    <GiveawayCard
      giveaway={g}
      charityName={charity.name}
      now={new Date()}
      state={current}
      context="preview"
      rulesHref={rulesHref}
      verifyHref={`/s/${charity.slug}/giveaways/${g.id}/verify`}
      winnerName={current === "drawn" ? "Ana R." : null}
    />
  );

  return (
    <div>
      <Link href={`/admin/giveaways/${g.id}`} className="text-sm text-warm-600 hover:text-pink-700">
        ← Back to the giveaway
      </Link>
      <h1 className="mt-3 text-3xl">Preview</h1>
      <p className="mt-1 text-sm text-warm-600">
        Exactly what entrants see. The form can&rsquo;t submit here.
      </p>
      <nav aria-label="Preview state" className="mt-4 flex flex-wrap gap-2">
        {STATES.map((s) => (
          <Link
            key={s.key}
            href={`?state=${s.key}`}
            aria-current={s.key === current ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              s.key === current ? "bg-pink-600 text-white" : "bg-white text-warm-700 ring-1 ring-warm-300 hover:bg-warm-50"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6 grid gap-8 lg:grid-cols-[22rem_1fr]">
        <div>
          <p className="mb-2 text-sm font-medium text-warm-600">Phone</p>
          <div className="w-full max-w-[22rem]">{card}</div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-warm-600">Your website</p>
          {card}
        </div>
      </div>
    </div>
  );
}
