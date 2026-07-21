import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contributions, products } from "@/lib/db/schema";

export async function getContributionsForCharity(charityId: string) {
  return db
    .select({
      id: contributions.id,
      createdAt: contributions.createdAt,
      amountCents: contributions.amountCents,
      donorName: contributions.donorName,
      donorEmail: contributions.donorEmail,
      status: contributions.status,
      displayPreference: contributions.displayPreference,
      productTitle: products.title,
    })
    .from(contributions)
    .innerJoin(products, eq(contributions.productId, products.id))
    .where(eq(contributions.charityId, charityId))
    .orderBy(desc(contributions.createdAt));
}

export async function getTotalsForCharity(charityId: string) {
  const rows = await db
    .select({
      totalCents: sql<number>`COALESCE(SUM(CASE WHEN ${contributions.status} = 'succeeded' THEN ${contributions.amountCents} ELSE 0 END), 0)`,
      count: sql<number>`COUNT(*) FILTER (WHERE ${contributions.status} = 'succeeded')`,
    })
    .from(contributions)
    .where(eq(contributions.charityId, charityId));
  return {
    totalCents: Number(rows[0]?.totalCents ?? 0),
    count: Number(rows[0]?.count ?? 0),
  };
}

/**
 * CSV field escaping with formula-injection defense.
 *
 * RFC 4180 quoting handles delimiters/quotes/newlines. Separately, spreadsheet
 * apps execute a cell whose text begins with =, +, -, @, or a control char —
 * and donor names are attacker-controlled free text from Stripe checkout. We
 * prefix any such value with a single quote so Excel/Sheets treat it as text,
 * not a formula.
 */
function csvField(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

export function contributionsToCsv(
  rows: Awaited<ReturnType<typeof getContributionsForCharity>>,
): string {
  const header = "Date,Product,Donor name,Donor email,Amount (USD),Status";
  const lines = rows.map((r) =>
    [
      r.createdAt.toISOString(),
      csvField(r.productTitle),
      csvField(r.donorName ?? ""),
      csvField(r.donorEmail ?? ""),
      (r.amountCents / 100).toFixed(2),
      r.status,
    ].join(","),
  );
  return [header, ...lines].join("\r\n") + "\r\n";
}
