import "server-only";
import { lt, sql } from "drizzle-orm";
import { db } from "./db";
import { throttleBuckets } from "./db/schema";

/**
 * Atomic fixed-window rate limiting, shared across serverless instances via
 * Postgres. One INSERT … ON CONFLICT statement per hit: every SET expression
 * reads the OLD row, so concurrent hits can't lose increments or reset a
 * window twice. Keys must never contain raw IPs or emails — hash them.
 */

export type ThrottleRule = { key: string; limit: number; windowSec: number };

export async function hit(
  key: string,
  opts: { limit: number; windowSec: number },
): Promise<{ allowed: boolean; count: number; resetAt: Date }> {
  const window = sql`${opts.windowSec} * interval '1 second'`;
  const expired = sql`${throttleBuckets.expiresAt} <= now()`;
  const [row] = await db
    .insert(throttleBuckets)
    .values({
      key,
      count: 1,
      windowStartedAt: sql`now()`,
      expiresAt: sql`now() + ${window}`,
    })
    .onConflictDoUpdate({
      target: throttleBuckets.key,
      set: {
        count: sql`case when ${expired} then 1 else ${throttleBuckets.count} + 1 end`,
        windowStartedAt: sql`case when ${expired} then now() else ${throttleBuckets.windowStartedAt} end`,
        expiresAt: sql`case when ${expired} then now() + ${window} else ${throttleBuckets.expiresAt} end`,
      },
    })
    .returning({ count: throttleBuckets.count, expiresAt: throttleBuckets.expiresAt });

  if (Math.random() < 0.01) void pruneExpired();
  return { allowed: row.count <= opts.limit, count: row.count, resetAt: row.expiresAt };
}

/** Counts EVERY rule (no short-circuit), so a blocked caller still spends
 *  budget everywhere; allowed only if all rules allow. */
export async function hitAll(rules: ThrottleRule[]): Promise<boolean> {
  const results = await Promise.all(
    rules.map((r) => hit(r.key, { limit: r.limit, windowSec: r.windowSec })),
  );
  return results.every((r) => r.allowed);
}

export async function pruneExpired(): Promise<void> {
  try {
    await db
      .delete(throttleBuckets)
      .where(lt(throttleBuckets.expiresAt, sql`now() - interval '1 hour'`));
  } catch (err) {
    console.warn("[throttle] prune failed (ignored)", err);
  }
}

/** Vercel sets x-forwarded-for; its first value is the client. */
export function clientIp(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return h.get("x-real-ip")?.trim() || "unknown";
}
