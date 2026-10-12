import Image from "next/image";
import Link from "next/link";
import GiveawayStatusChip from "@/components/admin/giveaways/GiveawayStatusChip";
import { ButtonLink } from "@/components/ui/Button";
import { getGiveawaysForCharity } from "@/lib/data/giveaways";
import { requireGiveawayAdmin } from "@/lib/giveaways/admin-access";
import { isGiveawaysGoLiveOpen } from "@/lib/giveaways/flags";
import { lastDay, money, shortDate } from "@/lib/giveaways/format";

export const metadata = { title: "Giveaways" };

export default async function GiveawaysPage() {
  const { charity } = await requireGiveawayAdmin();
  const items = await getGiveawaysForCharity(charity.id);
  const now = new Date();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Giveaways</h1>
          <p className="mt-1 text-sm text-warm-600">
            Prize giveaways that raise money — free to enter, with bonus entries for donors.
          </p>
        </div>
        <ButtonLink href="/admin/giveaways/new">New giveaway</ButtonLink>
      </div>

      {!isGiveawaysGoLiveOpen() && (
        <p className="mt-6 rounded-xl border border-warm-200 bg-white px-5 py-3.5 text-sm text-warm-800">
          You can build and preview giveaways now. Going live opens once our legal
          review of the Official Rules is complete — we&rsquo;ll email you the day it does.
        </p>
      )}

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-warm-300 bg-white p-10 text-center">
          <p className="text-lg text-warm-900">No giveaways yet.</p>
          <p className="mx-auto mt-2 max-w-md text-warm-700">
            A specific prize from your community draws more entries than a generic gift card.
          </p>
          <ButtonLink href="/admin/giveaways/new" className="mt-6">
            Set up your first giveaway
          </ButtonLink>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((g) => (
            <li key={g.id}>
              <Link
                href={`/admin/giveaways/${g.id}`}
                className="block overflow-hidden rounded-xl border border-warm-200 bg-white transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[4/3] bg-warm-100">
                  {g.prizePhotoUrl ? (
                    <Image src={g.prizePhotoUrl} alt="" fill sizes="(min-width: 1024px) 350px, (min-width: 640px) 45vw, 90vw" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-warm-500">No photo yet</div>
                  )}
                  <span className="absolute left-2 top-2">
                    <GiveawayStatusChip giveaway={g} now={now} short />
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="truncate text-lg text-warm-900">{g.prizeName}</h2>
                    <span className="whitespace-nowrap text-sm font-medium text-warm-700">{money(g.prizeArvCents)}</span>
                  </div>
                  <p className="mt-1 text-sm text-warm-600">
                    {now < g.endsAt ? `Ends ${shortDate(lastDay(g.endsAt), g.timezone)}` : "Ended"}
                    {g.status !== "draft" && ` · ${g.confirmedEntrants} ${g.confirmedEntrants === 1 ? "entrant" : "entrants"}`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
