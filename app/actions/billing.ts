"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { charities, subscriptions } from "@/lib/db/schema";
import { getCharityForUser } from "@/lib/data/charity";
import { stripe } from "@/lib/stripe";
import {
  getEntitlementsForCharity,
  getPlans,
  isBillingConfigured,
  upsertSubscription,
  type PlanKey,
} from "@/lib/billing";
import { requireSession } from "@/lib/session";
import { siteConfig } from "@/lib/site";

/**
 * Yufora's own subscription billing — deliberately a separate file from
 * app/actions/stripe.ts (the Connect donation rail). The whole difference
 * between the rails: these calls carry NO { stripeAccount } option, so
 * they run on the PLATFORM account.
 */

/** Session → charity, or back to the dashboard. */
async function requireCharity() {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity) redirect("/admin");
  return { session, charity };
}

/**
 * Create-if-missing platform Customer, mirroring how connectStripe lazily
 * creates the Connect account. Lazy on purpose: charity creation must keep
 * working with no Stripe env at all.
 *
 * The column write is a compare-and-set so two concurrent first checkouts
 * can't orphan a Customer: the loser adopts the stored winner and deletes
 * its own (guaranteed-empty) Customer. Otherwise a Checkout could be bound
 * to a Customer that no longer matches charities.stripeCustomerId, and
 * both the webhook and the sync would refuse the resulting subscription
 * forever.
 */
async function ensureCustomer(
  charity: { id: string; name: string; stripeCustomerId: string | null },
  email: string,
): Promise<string> {
  if (charity.stripeCustomerId) return charity.stripeCustomerId;

  const customer = await stripe().customers.create({
    name: charity.name,
    email,
    metadata: { yuforaCharityId: charity.id },
  });

  const claimed = await db
    .update(charities)
    .set({ stripeCustomerId: customer.id })
    .where(
      and(eq(charities.id, charity.id), isNull(charities.stripeCustomerId)),
    )
    .returning({ stripeCustomerId: charities.stripeCustomerId });

  if (claimed.length > 0) return customer.id;

  // Lost the race — adopt whoever won and clean up our orphan.
  const [current] = await db
    .select({ stripeCustomerId: charities.stripeCustomerId })
    .from(charities)
    .where(eq(charities.id, charity.id))
    .limit(1);
  await stripe()
    .customers.del(customer.id)
    .catch(() => {});
  return current?.stripeCustomerId ?? customer.id;
}

/** Starts Stripe Checkout for the chosen plan (mode: subscription). */
export async function startSubscriptionCheckout(planKey: string): Promise<void> {
  const { session, charity } = await requireCharity();
  if (!isBillingConfigured()) redirect("/admin/billing");

  // Server-side guard against a second subscription (stale tab, back
  // button, double submit). The UI hiding the picker is not a gate.
  const entitlements = await getEntitlementsForCharity(charity);
  if (entitlements.reason === "subscribed" || entitlements.reason === "exempt") {
    redirect("/admin/billing");
  }

  const plan = getPlans().find((p) => p.key === (planKey as PlanKey));
  if (!plan) redirect("/admin/billing");

  const customer = await ensureCustomer(charity, session.user.email);

  // The no-card trial is once per charity, ever. Any prior subscription
  // row — including a canceled trial — consumes it, so re-subscribing
  // can't mint unlimited free access. Keyed on charityId, so recreating
  // the Stripe Customer doesn't reset eligibility either.
  const configuredTrialDays = Number(process.env.BILLING_TRIAL_DAYS ?? 0);
  const priorSubs = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.charityId, charity.id))
    .limit(1);
  const trialDays = priorSubs.length === 0 ? configuredTrialDays : 0;

  let checkoutUrl: string | null = null;
  try {
    const checkout = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      allow_promotion_codes: true,
      ...(trialDays > 0
        ? {
            payment_method_collection: "if_required" as const,
            subscription_data: {
              trial_period_days: trialDays,
              trial_settings: {
                end_behavior: { missing_payment_method: "cancel" as const },
              },
              metadata: { yuforaCharityId: charity.id },
            },
          }
        : {
            subscription_data: { metadata: { yuforaCharityId: charity.id } },
          }),
      metadata: { yuforaCharityId: charity.id },
      success_url: `${siteConfig.url}/admin/billing/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteConfig.url}/admin/billing`,
    });
    checkoutUrl = checkout.url;
  } catch (err) {
    console.error("[billing] checkout session create failed", err);
  }

  // redirect() throws NEXT_REDIRECT — always outside the try.
  redirect(checkoutUrl ?? "/admin/billing?error=checkout");
}

/** Opens Stripe's Billing Portal — card updates, cancel, invoices. */
export async function openBillingPortal(): Promise<void> {
  const { charity } = await requireCharity();
  if (!charity.stripeCustomerId) redirect("/admin/billing");

  let url: string | null = null;
  try {
    const portal = await stripe().billingPortal.sessions.create({
      customer: charity.stripeCustomerId,
      return_url: `${siteConfig.url}/admin/billing`,
    });
    url = portal.url;
  } catch (err) {
    // Most often: the Billing Portal default configuration hasn't been
    // saved in the Stripe dashboard. Don't strand the only path to
    // updating a card or cancelling — say so on the billing page.
    console.error("[billing] portal session create failed", err);
  }

  redirect(url ?? "/admin/billing?portal=unavailable");
}

/**
 * Called from the checkout return page: pull the fresh subscription state
 * straight from Stripe and cache it. The webhook usually lands second —
 * this mirrors syncStripeStatus() on the Connect rail.
 *
 * The ordering stamp is sub.created (STRIPE's clock), never Date.now():
 * every real webhook event has created >= sub.created, so this sync can
 * seed or refresh the row but can never mark a genuine Stripe event as
 * stale. Using our wall clock here would let a charity freeze its own
 * subscription row and keep entitlements after cancelling.
 */
export async function syncSubscriptionStatus(
  checkoutSessionId: string,
): Promise<{ ok: boolean }> {
  const { charity } = await requireCharity();
  if (!isBillingConfigured() || !checkoutSessionId) return { ok: false };

  let checkout: Stripe.Checkout.Session;
  try {
    checkout = await stripe().checkout.sessions.retrieve(checkoutSessionId, {
      expand: ["subscription"],
    });
  } catch {
    // Unknown/foreign id or a Stripe blip — the webhook will reconcile.
    // Failing identically for both also avoids an id-existence oracle.
    return { ok: false };
  }

  // The session must belong to this charity's customer — never trust the id.
  if (
    checkout.metadata?.yuforaCharityId !== charity.id ||
    (typeof checkout.customer === "string"
      ? checkout.customer
      : checkout.customer?.id) !== charity.stripeCustomerId
  ) {
    return { ok: false };
  }

  const sub = checkout.subscription;
  if (!sub || typeof sub === "string") return { ok: false };

  try {
    await upsertSubscription(sub, charity.id, sub.created);
  } catch (err) {
    console.error("[billing] sync upsert failed", err);
    return { ok: false };
  }
  return { ok: true };
}
