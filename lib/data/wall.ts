import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { charities, contributions, products } from "@/lib/db/schema";

export type WallEntry = {
  /** Null when the donor chose anonymity. */
  name: string | null;
  /** Null unless the donor explicitly allowed showing the amount. */
  amountCents: number | null;
  productTitle: string;
  createdAt: Date;
};

export type TopSupporter = {
  name: string;
  totalCents: number;
};

const RECENT_LIMIT = 12;
const TOP_LIMIT = 10;

/**
 * Recent supporters — every successful gift, rendered only as generously as
 * each donor permitted: name, name+amount, or "Someone".
 */
export async function getRecentWall(slug: string): Promise<WallEntry[] | null> {
  const charity = (
    await db.select().from(charities).where(eq(charities.slug, slug)).limit(1)
  )[0];
  if (!charity) return null;

  const rows = await db
    .select({
      donorName: contributions.donorName,
      amountCents: contributions.amountCents,
      displayPreference: contributions.displayPreference,
      createdAt: contributions.createdAt,
      productTitle: products.title,
    })
    .from(contributions)
    .innerJoin(products, eq(contributions.productId, products.id))
    .where(
      and(
        eq(contributions.charityId, charity.id),
        eq(contributions.status, "succeeded"),
      ),
    )
    .orderBy(desc(contributions.createdAt))
    .limit(RECENT_LIMIT);

  return rows.map((r) => ({
    name:
      r.displayPreference === "anonymous" ? null : (r.donorName?.trim() || null),
    amountCents:
      r.displayPreference === "name_amount" ? r.amountCents : null,
    productTitle: r.productTitle,
    createdAt: r.createdAt,
  }));
}

/**
 * Top supporters — only donors who allowed name AND amount, aggregated
 * across their gifts.
 */
export async function getTopWall(slug: string): Promise<TopSupporter[] | null> {
  const charity = (
    await db.select().from(charities).where(eq(charities.slug, slug)).limit(1)
  )[0];
  if (!charity) return null;

  const rows = await db
    .select({
      name: contributions.donorName,
      totalCents: sql<number>`SUM(${contributions.amountCents})`,
    })
    .from(contributions)
    .where(
      and(
        eq(contributions.charityId, charity.id),
        eq(contributions.status, "succeeded"),
        eq(contributions.displayPreference, "name_amount"),
      ),
    )
    .groupBy(contributions.donorName, contributions.donorEmail)
    .orderBy(sql`SUM(${contributions.amountCents}) DESC`)
    .limit(TOP_LIMIT);

  return rows
    .filter((r) => r.name?.trim())
    .map((r) => ({ name: r.name!.trim(), totalCents: Number(r.totalCents) }));
}

/** "2m ago" / "3h ago" / "5d ago" — coarse on purpose. */
export function timeAgo(date: Date): string {
  const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}
