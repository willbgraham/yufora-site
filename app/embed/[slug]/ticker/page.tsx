import Link from "next/link";
import { notFound } from "next/navigation";
import Ticker from "@/components/shop/Ticker";
import { getTickerData } from "@/lib/data/ticker";

// Stripe is read at render time; a short cache keeps the widget snappy
// under traffic without hammering the charity's API limits.
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

/** The standalone donor wall as embedded on the charity's own site. */
export default async function EmbedTickerPage({ params }: Props) {
  const { slug } = await params;
  const data = await getTickerData(slug);
  if (!data) notFound();

  return (
    <div>
      <Ticker data={data} />
      <p className="mt-3 text-right">
        <Link
          href="/"
          target="_blank"
          rel="noopener"
          className="text-xs text-warm-400 hover:text-pink-700"
        >
          Powered by Yufora
        </Link>
      </p>
    </div>
  );
}
