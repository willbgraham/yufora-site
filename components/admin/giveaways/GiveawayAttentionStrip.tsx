import Link from "next/link";
import type { AttentionItem } from "@/lib/data/giveaways";

const COPY: Record<AttentionItem["kind"], (prize: string) => { text: string; cta: string }> = {
  ready_to_draw: (p) => ({ text: `“${p}” has ended and is ready to draw.`, cta: "Draw the winner" }),
  drawing: (p) => ({ text: `The draw for “${p}” is waiting to finish.`, cta: "Finish the draw" }),
  claim_lapsed: (p) => ({ text: `Your winner for “${p}” didn't accept by the deadline.`, cta: "Pass it to the next alternate" }),
  claim_declined: (p) => ({ text: `Your winner for “${p}” declined the prize.`, cta: "Pass it to the next alternate" }),
  claim_accepted: (p) => ({ text: `Your winner for “${p}” accepted.`, cta: "See next steps" }),
};

/** Stands in for time-based emails until a scheduled job exists. */
export default function GiveawayAttentionStrip({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => {
        const c = COPY[item.kind](item.prizeName);
        return (
          <li key={`${item.campaignId}-${item.kind}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pink-200 bg-pink-50 px-5 py-3.5 text-sm">
            <span className="text-warm-800">{c.text}</span>
            <Link href={`/admin/giveaways/${item.campaignId}`} className="font-medium text-pink-700 hover:underline">
              {c.cta} →
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
