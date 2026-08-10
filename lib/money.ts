const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** $1,200 for whole-dollar amounts, $1,200.50 otherwise. */
export function formatCents(cents: number): string {
  return cents % 100 === 0 ? usdWhole.format(cents / 100) : usd.format(cents / 100);
}

/**
 * Parses a human dollar amount ("1200", "$1,200.50") to integer cents.
 * Returns null if invalid, zero/negative, or over $1,000,000.
 */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(parseFloat(cleaned) * 100);
  if (!Number.isFinite(cents) || cents <= 0 || cents > 100_000_000) return null;
  return cents;
}
