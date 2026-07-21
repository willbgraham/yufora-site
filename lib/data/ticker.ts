import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { charities, wallEntries } from "@/lib/db/schema";
import { isStripeConfigured, stripe } from "@/lib/stripe";

export type TickerItem = { amountCents: number; createdAt: Date };

export type TickerData = {
  charityName: string;
  connected: boolean;
  /** Recent successful charges — amounts and times only, never identities. */
  items: TickerItem[];
  monthTotalCents: number;
  monthCount: number;
  /** Charity-curated recognized supporters (attested permission). */
  recognized: { name: string; amountCents: number | null }[];
};

const FEED_LIMIT = 10;

/**
 * Renders the standalone wall from the charity's OWN Stripe account,
 * read at request time — we deliberately store none of it. Only amounts
 * and timestamps ever leave this function.
 */
export async function getTickerData(slug: string): Promise<TickerData | null> {
  const charity = (
    await db.select().from(charities).where(eq(charities.slug, slug)).limit(1)
  )[0];
  if (!charity) return null;

  const recognized = (
    await db
      .select()
      .from(wallEntries)
      .where(eq(wallEntries.charityId, charity.id))
      .orderBy(desc(wallEntries.createdAt))
      .limit(20)
  ).map((e) => ({ name: e.name, amountCents: e.amountCents }));

  const base: TickerData = {
    charityName: charity.name,
    connected: false,
    items: [],
    monthTotalCents: 0,
    monthCount: 0,
    recognized,
  };

  if (!charity.tickerStripeAccountId || !isStripeConfigured()) return base;

  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const charges = await stripe().charges.list(
      { limit: 100, created: { gte: Math.floor(monthStart.getTime() / 1000) } },
      { stripeAccount: charity.tickerStripeAccountId },
    );

    const succeeded = charges.data.filter((c) => c.status === "succeeded" && !c.refunded);
    const items = succeeded.slice(0, FEED_LIMIT).map((c) => ({
      amountCents: c.amount,
      createdAt: new Date(c.created * 1000),
    }));

    return {
      ...base,
      connected: true,
      items,
      monthTotalCents: succeeded.reduce((sum, c) => sum + c.amount, 0),
      monthCount: succeeded.length,
    };
  } catch (err) {
    console.error("[ticker] stripe read failed", err);
    // Render what we can (curated names) rather than a broken widget.
    return base;
  }
}
