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
  /** Env var holding this plan's Stripe Price id(s). */
  env: string;
  products: readonly ProductKey[];
  /** Marketing one-liner for the plan picker. */
  blurb: string;
};

/**
 * Approved pricing (2026-08): Donor Wall $19 · Shop $49 · Contests $39 ·
 * Everything $79 (sold at $59 until contests ship). Amounts live on the
 * Stripe Prices, not here.
 *
 * RE-PRICING: Stripe Prices are immutable, so a price change means
 * creating a NEW Price. Each env var therefore holds a COMMA-SEPARATED
 * list: the first id is what new checkouts buy, and every later id is a
 * grandfathered price that still resolves to this plan. Prepend the new
 * id; never remove one while any subscriber is still on it, or they'd
 * silently lose their entitlements while still paying.
 *   STRIPE_PRICE_SHOP="price_NEW,price_OLD"
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

export type ConfiguredPlan = PlanDef & {
  /** What new checkouts buy (first id in the env list). */
  priceId: string;
  /** Every id that resolves to this plan, including grandfathered ones. */
  priceIds: string[];
};

/** Plans whose Stripe Price is configured — the only ones that exist. */
export function getPlans(): ConfiguredPlan[] {
  return PLAN_DEFS.flatMap((def) => {
    const ids = (process.env[def.env] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return ids.length > 0
      ? [{ ...def, priceId: ids[0], priceIds: ids }]
      : [];
  });
}

/** Billing is on iff Stripe works AND at least one plan price is set. */
export function isBillingConfigured(): boolean {
  return isStripeConfigured() && getPlans().length > 0;
}

export function resolvePlan(priceId: string): ConfiguredPlan | null {
  return getPlans().find((p) => p.priceIds.includes(priceId)) ?? null;
}

/** Plans with live amounts fetched from Stripe, for the plan picker UI. */
export async function getPlansWithAmounts(): Promise<
  (ConfiguredPlan & { amountCents: number | null })[]
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

/**
 * Defense in depth against a frozen row: a "trialing" subscription whose
 * trial ended well in the past can only mean we missed the transition
 * webhook. Trials are bounded, so this is safe to enforce — the grace
 * covers ordinary webhook lag around the conversion moment. Deliberately
 * NOT applied to active/past_due: a missed renewal webhook must never
 * de-entitle someone who is genuinely paying.
 */
const TRIAL_EXPIRY_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

function isStaleTrial(row: {
  status: SubscriptionStatus;
  trialEnd: Date | null;
}): boolean {
  return (
    row.status === "trialing" &&
    row.trialEnd !== null &&
    Date.now() - row.trialEnd.getTime() > TRIAL_EXPIRY_GRACE_MS
  );
}

export type Entitlements = {
  donorWall: boolean;
  shop: boolean;
  contests: boolean;
  plan: PlanKey | null;
  status: SubscriptionStatus | null;
  /**
   * unconfigured = billing off · exempt = comped · subscribed = paying ·
   * lapsed = subscribed before, not now · none = never subscribed.
   */
  reason: "unconfigured" | "exempt" | "subscribed" | "lapsed" | "none";
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  /**
   * Trial ends within a week — computed here rather than in a component,
   * since a no-card trial hard-cancels and the warning is time-sensitive.
   */
  trialEndsSoon: boolean;
};

const TRIAL_WARNING_MS = 7 * 24 * 60 * 60 * 1000;

function trialEndsSoon(status: SubscriptionStatus | null, trialEnd: Date | null) {
  return (
    status === "trialing" &&
    trialEnd !== null &&
    trialEnd.getTime() - Date.now() < TRIAL_WARNING_MS
  );
}

const ALL_ON = { donorWall: true, shop: true, contests: true } as const;
const ALL_OFF = { donorWall: false, shop: false, contests: false } as const;
const NO_DATES = {
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  trialEnd: null,
  trialEndsSoon: false,
} as const;

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
    return { ...ALL_ON, ...NO_DATES, plan: null, status: null, reason: "unconfigured" };
  }
  if (charity.billingExempt) {
    return { ...ALL_ON, ...NO_DATES, plan: null, status: null, reason: "exempt" };
  }

  const rows = await db
    .select({
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      stripePriceId: subscriptions.stripePriceId,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      trialEnd: subscriptions.trialEnd,
    })
    .from(subscriptions)
    .where(eq(subscriptions.charityId, charity.id));

  const entitledRows = rows.filter(
    (r) => ENTITLED_STATUSES.includes(r.status) && !isStaleTrial(r),
  );
  if (entitledRows.length === 0) {
    return {
      ...ALL_OFF,
      ...NO_DATES,
      plan: null,
      status: null,
      // Rows existing at all means they subscribed once — a lapse, not a
      // never-started account. The admin copy differs sharply.
      reason: rows.length > 0 ? "lapsed" : "none",
    };
  }

  // Union the products of every entitled subscription (normally one row).
  const products = new Set<ProductKey>();
  for (const row of entitledRows) {
    const plan = resolvePlan(row.stripePriceId);
    if (!plan) {
      // A paying subscriber whose price is no longer in the env map would
      // silently lose everything — loud, because it is always a config bug.
      console.error(
        `[billing] entitled subscription ${row.stripeSubscriptionId} has unmapped price ${row.stripePriceId} — add it to the STRIPE_PRICE_* list for its plan`,
      );
      continue;
    }
    for (const p of plan.products) products.add(p);
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
    cancelAtPeriodEnd: best?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: best?.currentPeriodEnd ?? null,
    trialEnd: best?.trialEnd ?? null,
    trialEndsSoon: trialEndsSoon(best?.status ?? null, best?.trialEnd ?? null),
  };
}

/**
 * Bulk variant for list pages (avoids N+1). Returns a map keyed by
 * charity id.
 */
export async function getEntitlementsForCharities(
  rows: { id: string; billingExempt: boolean }[],
): Promise<Map<string, Entitlements>> {
  const map = new Map<string, Entitlements>();
  if (rows.length === 0) return map;

  if (!isBillingConfigured()) {
    for (const c of rows) {
      map.set(c.id, {
        ...ALL_ON,
        ...NO_DATES,
        plan: null,
        status: null,
        reason: "unconfigured",
      });
    }
    return map;
  }

  const subs = await db
    .select({
      charityId: subscriptions.charityId,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      stripePriceId: subscriptions.stripePriceId,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      trialEnd: subscriptions.trialEnd,
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
      map.set(c.id, {
        ...ALL_ON,
        ...NO_DATES,
        plan: null,
        status: null,
        reason: "exempt",
      });
      continue;
    }
    const mine = subs.filter((s) => s.charityId === c.id);
    const entitled = mine.filter(
      (s) => ENTITLED_STATUSES.includes(s.status) && !isStaleTrial(s),
    );
    if (entitled.length === 0) {
      map.set(c.id, {
        ...ALL_OFF,
        ...NO_DATES,
        plan: null,
        status: null,
        reason: mine.length > 0 ? "lapsed" : "none",
      });
      continue;
    }
    const products = new Set<ProductKey>();
    for (const s of entitled) {
      const plan = resolvePlan(s.stripePriceId);
      if (!plan) {
        console.error(
          `[billing] entitled subscription ${s.stripeSubscriptionId} has unmapped price ${s.stripePriceId}`,
        );
        continue;
      }
      for (const p of plan.products) products.add(p);
    }
    const best = entitled[0];
    map.set(c.id, {
      donorWall: products.has("donorWall"),
      shop: products.has("shop"),
      contests: products.has("contests"),
      plan: resolvePlan(best.stripePriceId)?.key ?? null,
      status: best.status,
      reason: "subscribed",
      cancelAtPeriodEnd: best.cancelAtPeriodEnd,
      currentPeriodEnd: best.currentPeriodEnd,
      trialEnd: best.trialEnd,
      trialEndsSoon: trialEndsSoon(best.status, best.trialEnd),
    });
  }
  return map;
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
 *
 * CLOCKS: eventCreated must always come from STRIPE's clock (event.created
 * for webhooks, sub.created for the return-page sync) — never Date.now().
 * Mixing our wall clock into this column would let a sync stamp a value
 * ahead of real events and permanently discard them.
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
