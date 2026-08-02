"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { charities } from "@/lib/db/schema";
import { getCharityForUser } from "@/lib/data/charity";
import { stripe } from "@/lib/stripe";
import {
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
 * Create-if-missing platform Customer for the charity, mirroring how
 * connectStripe lazily creates the Connect account. Lazy on purpose:
 * charity creation must keep working with no Stripe env at all.
 */
async function ensureCustomer(charity: {
  id: string;
  name: string;
  stripeCustomerId: string | null;
}, email: string): Promise<string> {
  if (charity.stripeCustomerId) return charity.stripeCustomerId;

  const customer = await stripe().customers.create({
    name: charity.name,
    email,
    metadata: { yuforaCharityId: charity.id },
  });
  await db
    .update(charities)
    .set({ stripeCustomerId: customer.id })
    .where(eq(charities.id, charity.id));
  return customer.id;
}

/** Starts Stripe Checkout for the chosen plan (mode: subscription). */
export async function startSubscriptionCheckout(planKey: string): Promise<void> {
  const { session, charity } = await requireCharity();
  if (!isBillingConfigured()) redirect("/admin/billing");

  const plan = getPlans().find((p) => p.key === (planKey as PlanKey));
  if (!plan) redirect("/admin/billing");

  const customer = await ensureCustomer(charity, session.user.email);

  const trialDays = Number(process.env.BILLING_TRIAL_DAYS ?? 0);

  const checkout = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    allow_promotion_codes: true,
    // 30-day live trial with no card required (approved trial motion).
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

  if (!checkout.url) redirect("/admin/billing");
  redirect(checkout.url);
}

/** Opens Stripe's Billing Portal — card updates, cancel, invoices. */
export async function openBillingPortal(): Promise<void> {
  const { charity } = await requireCharity();
  if (!charity.stripeCustomerId) redirect("/admin/billing");

  const portal = await stripe().billingPortal.sessions.create({
    customer: charity.stripeCustomerId,
    return_url: `${siteConfig.url}/admin/billing`,
  });
  redirect(portal.url);
}

/**
 * Called from the checkout return page: pull the fresh subscription state
 * straight from Stripe and cache it. The webhook usually lands second —
 * this mirrors syncStripeStatus() on the Connect rail, and the stale-event
 * guard keeps the two writers from fighting.
 */
export async function syncSubscriptionStatus(
  checkoutSessionId: string,
): Promise<{ ok: boolean }> {
  const { charity } = await requireCharity();
  if (!isBillingConfigured() || !checkoutSessionId) return { ok: false };

  const checkout = await stripe().checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["subscription"],
  });

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

  await upsertSubscription(sub, charity.id, Math.floor(Date.now() / 1000));
  return { ok: true };
}
