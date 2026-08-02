import "server-only";
import type Stripe from "stripe";
import { eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, type SubscriptionStatus } from "@/lib/db/schema";
import { isStripeConfigured, stripe } from "@/lib/stripe";

/**
 * Yufora's own subscription billing (the PLATFORM Stripe account) —
 * entirely separate from the donation rails in lib/stripe-webhook.ts,
 * which must never be touched by billing work.
 *
 * Same fallback principle as everything else in this repo: with no
 * STRIPE_PRICE_* env set, billing is off and every charity is fully
 * entitled — the site behaves exactly as it did before billing existed,
 * which makes shipping this code deploy-safe at any time.
 */

export type ProductKey = "donorWall" | "shop" | "contests";
export type PlanKey = "donor-wall" | "shop" | "contests" | "everything";

export type PlanDef = {
  key: PlanKey;
  label: string;
  /** Env var holding the Stripe Price id (price_...) for this plan. */
  env: string;
  products: readonly ProductKey[];
  /** Marketing one-liner for the plan picker. */
  blurb: string;
};

/**
 * Approved pricing (2026-08): Donor Wall $19 · Shop $49 · Contests $39 ·
 * Everything $79 (sold at $59 until contests ship). Amounts live on the
 * Stripe Prices, not here — re-pricing is an env/dashboard change.
 */
const PLAN_DEFS: readonly PlanDef[] = [
  {
    key: "everything",
    label: "Everything",
    env: "STRIPE_PRICE_EVERYTHING",
    products: ["donorWall", "shop", "contests"],
    blurb: "All Yufora tools, one flat number.",
  },
  {
    key: "shop",
    label: "Wishlist Shop",
    env: "STRIPE_PRICE_SHOP",
    products: ["shop"],
    blurb: "A real shop on your site. The money lands in your Stripe — we take none of it.",
  },
  {
    key: "donor-wall",
    label: "Donor Wall",
    env: "STRIPE_PRICE_DONOR_WALL",
    products: ["donorWall"],
    blurb: "Live giving activity on your website, from the Stripe you already use.",
  },
  {
    key: "contests",
    label: "Referral Contests",
    env: "STRIPE_PRICE_CONTESTS",
    products: ["contests"],
    blurb: "Grow your email list with a contest — Official Rules included.",
  },
] as const;

/** Plans whose Stripe Price is configured — the only ones that exist. */
export function getPlans(): (PlanDef & { priceId: string })[] {
  return PLAN_DEFS.flatMap((def) => {
    const priceId = process.env[def.env];
    return priceId ? [{ ...def, priceId }] : [];
  });
}

/** Billing is on iff Stripe works AND at least one plan price is set. */
export function isBillingConfigured(): boolean {
  return isStripeConfigured() && getPlans().length > 0;
}

export function resolvePlan(priceId: string): PlanDef | null {
  return getPlans().find((p) => p.priceId === priceId) ?? null;
}

/** Plans with live amounts fetched from Stripe, for the plan picker UI. */
export async function getPlansWithAmounts(): Promise<
  (PlanDef & { priceId: string; amountCents: number | null })[]
> {
  const plans = getPlans();
  return Promise.all(
    plans.map(async (plan) => {
      try {
        const price = await stripe().prices.retrieve(plan.priceId);
        return { ...plan, amountCents: price.unit_amount };
      } catch (err) {
        console.error(`[billing] price fetch failed for ${plan.key}`, err);
        return { ...plan, amountCents: null };
      }
    }),
  );
}

/**
 * Entitled statuses. past_due IS the grace period — Stripe's smart-retry
 * dunning runs for days and then flips the subscription to canceled or
 * unpaid, which is the cutoff. No custom grace timer needed.
 */
const ENTITLED_STATUSES: readonly SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
];

export type Entitlements = {
  donorWall: boolean;
  shop: boolean;
  contests: boolean;
  plan: PlanKey | null;
  status: SubscriptionStatus | null;
  reason: "unconfigured" | "exempt" | "subscribed" | "none";
};

const ALL_ON = { donorWall: true, shop: true, contests: true } as const;
const ALL_OFF = { donorWall: false, shop: false, contests: false } as const;

/**
 * The single entitlement read. Public data-layer functions and admin
 * actions both call this — it is the only gate the unauthenticated embed
 * routes can rely on.
 */
export async function getEntitlementsForCharity(charity: {
  id: string;
  billingExempt: boolean;
}): Promise<Entitlements> {
  if (!isBillingConfigured()) {
    return { ...ALL_ON, plan: null, status: null, reason: "unconfigured" };
  }
  if (charity.billingExempt) {
    return { ...ALL_ON, plan: null, status: null, reason: "exempt" };
  }

  const rows = await db
    .select({
      stripePriceId: subscriptions.stripePriceId,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(eq(subscriptions.charityId, charity.id));

  const entitledRows = rows.filter((r) =>
    ENTITLED_STATUSES.includes(r.status),
  );
  if (entitledRows.length === 0) {
    return { ...ALL_OFF, plan: null, status: null, reason: "none" };
  }

  // Union the products of every entitled subscription (normally one row).
  const products = new Set<ProductKey>();
  for (const row of entitledRows) {
    for (const p of resolvePlan(row.stripePriceId)?.products ?? []) {
      products.add(p);
    }
  }

  // Best row for display: healthy statuses first, then latest period end.
  const best = [...entitledRows].sort((a, b) => {
    const rank = (s: SubscriptionStatus) =>
      s === "active" ? 0 : s === "trialing" ? 1 : 2;
    return (
      rank(a.status) - rank(b.status) ||
      (b.currentPeriodEnd?.getTime() ?? 0) - (a.currentPeriodEnd?.getTime() ?? 0)
    );
  })[0];

  return {
    donorWall: products.has("donorWall"),
    shop: products.has("shop"),
    contests: products.has("contests"),
    plan: best ? (resolvePlan(best.stripePriceId)?.key ?? null) : null,
    status: best?.status ?? null,
    reason: "subscribed",
  };
}

/**
 * Reads current_period_end wherever the installed API version puts it —
 * newer Stripe API versions moved it from the Subscription onto its items.
 */
function subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  const raw =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    sub.items?.data?.[0]?.current_period_end;
  return typeof raw === "number" ? new Date(raw * 1000) : null;
}

/**
 * The one write path for subscription state — used by both the billing
 * webhook and the checkout-return sync. Idempotent AND ordered: the
 * setWhere stale-event guard means replays are no-ops and an out-of-order
 * older event can never regress newer state.
 */
export async function upsertSubscription(
  sub: Stripe.Subscription,
  charityId: string,
  eventCreated: number,
): Promise<"applied" | "stale"> {
  const values = {
    charityId,
    stripeCustomerId:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripeSubscriptionId: sub.id,
    stripePriceId: sub.items.data[0]?.price?.id ?? "",
    status: sub.status as SubscriptionStatus,
    currentPeriodEnd: subscriptionPeriodEnd(sub),
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    lastEventCreated: eventCreated,
  };

  const applied = await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        stripePriceId: values.stripePriceId,
        status: values.status,
        currentPeriodEnd: values.currentPeriodEnd,
        cancelAtPeriodEnd: values.cancelAtPeriodEnd,
        trialEnd: values.trialEnd,
        lastEventCreated: values.lastEventCreated,
        updatedAt: sql`now()`,
      },
      setWhere: lte(subscriptions.lastEventCreated, eventCreated),
    })
    .returning({ id: subscriptions.id });

  return applied.length > 0 ? "applied" : "stale";
}

/**
 * Bulk variant used by list pages (avoids N+1). Returns a map keyed by
 * charity id; charities with no entitled subscription map to ALL_OFF
 * (unless billing is off or they're exempt).
 */
export async function getEntitlementsForCharities(
  rows: { id: string; billingExempt: boolean }[],
): Promise<Map<string, Entitlements>> {
  const map = new Map<string, Entitlements>();
  if (rows.length === 0) return map;

  if (!isBillingConfigured()) {
    for (const c of rows) {
      map.set(c.id, { ...ALL_ON, plan: null, status: null, reason: "unconfigured" });
    }
    return map;
  }

  const subs = await db
    .select({
      charityId: subscriptions.charityId,
      stripePriceId: subscriptions.stripePriceId,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(
      inArray(
        subscriptions.charityId,
        rows.map((c) => c.id),
      ),
    );

  for (const c of rows) {
    if (c.billingExempt) {
      map.set(c.id, { ...ALL_ON, plan: null, status: null, reason: "exempt" });
      continue;
    }
    const entitled = subs.filter(
      (s) => s.charityId === c.id && ENTITLED_STATUSES.includes(s.status),
    );
    if (entitled.length === 0) {
      map.set(c.id, { ...ALL_OFF, plan: null, status: null, reason: "none" });
      continue;
    }
    const products = new Set<ProductKey>();
    for (const s of entitled) {
      for (const p of resolvePlan(s.stripePriceId)?.products ?? []) {
        products.add(p);
      }
    }
    map.set(c.id, {
      donorWall: products.has("donorWall"),
      shop: products.has("shop"),
      contests: products.has("contests"),
      plan: resolvePlan(entitled[0].stripePriceId)?.key ?? null,
      status: entitled[0].status,
      reason: "subscribed",
    });
  }
  return map;
}
