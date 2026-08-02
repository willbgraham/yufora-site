import type { TickerData } from "@/lib/data/ticker";
import Ticker from "@/components/shop/Ticker";

/**
 * The real donor-wall component rendered with sample data, so marketing
 * pages show exactly what the product looks like — and can never drift
 * from it. Timestamps freeze at build time on static pages; "2m ago"
 * reads fine forever, which is the point of the coarse labels.
 */
const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000);

const DEMO_DATA: TickerData = {
  // Required by the type; Ticker never renders it.
  charityName: "Demo Animal Rescue",
  connected: true,
  monthTotalCents: 324_000,
  monthCount: 41,
  items: [
    { amountCents: 2_500, createdAt: minsAgo(2) },
    { amountCents: 5_000, createdAt: minsAgo(11) },
    { amountCents: 1_000, createdAt: minsAgo(34) },
    { amountCents: 10_000, createdAt: minsAgo(60) },
    { amountCents: 2_060, createdAt: minsAgo(3 * 60) },
    { amountCents: 25_000, createdAt: minsAgo(5 * 60) },
    { amountCents: 1_500, createdAt: minsAgo(9 * 60) },
    { amountCents: 7_500, createdAt: minsAgo(26 * 60) },
  ],
  recognized: [
    { name: "The Alvarez Family", amountCents: 50_000 },
    { name: "Marisol & Greg T.", amountCents: null },
    { name: "Cedar Lane Dental", amountCents: 100_000 },
    { name: "A friend of the shelter", amountCents: 25_000 },
  ],
};

export default function DonorWallDemo({ className }: { className?: string }) {
  return (
    <div
      className={[
        "rounded-xl border border-warm-200 bg-white p-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Ticker data={DEMO_DATA} />
      <p className="mt-4 text-center text-xs text-warm-500">
        illustration — your wall shows your real numbers
      </p>
    </div>
  );
}
