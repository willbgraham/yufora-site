import "server-only";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { charities } from "@/lib/db/schema";
import { upsertSubscription } from "@/lib/billing";

/**
 * Pure handling for PLATFORM billing events (Yufora's own subscriptions),
 * separated from signature verification so it can be tested with synthetic
 * events — the same pattern as lib/stripe-webhook.ts, which handles the
 * donation rail and is deliberately NOT touched by billing work.
 *
 * No Stripe API calls in here: every event we act on carries the full
 * subscription object, so the handler stays synchronous-with-the-db and
 * testable offline.
 */
export async function handleBillingEvent(event: Stripe.Event): Promise<string> {
  // Defense in depth: this endpoint must only ever receive events from OUR
  // platform account. A connected-account event landing here means the
  // endpoint was misconfigured in the dashboard — refuse it loudly-quietly.
  if (event.account) {
    return "ignored: connected-account event on billing endpoint";
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      // Resolve the charity: metadata first (set by our own checkout code),
      // customer-id lookup as fallback. Either way the binding is verified
      // against the stored stripeCustomerId — metadata alone is never
      // trusted to pick the row.
      const metaCharityId = sub.metadata?.yuforaCharityId;
      const rows = await db
        .select({
          id: charities.id,
          stripeCustomerId: charities.stripeCustomerId,
        })
        .from(charities)
        .where(
          metaCharityId
            ? eq(charities.id, metaCharityId)
            : eq(charities.stripeCustomerId, customerId),
        )
        .limit(1);
      const charity = rows[0];
      if (!charity) return "ignored: unknown charity";
      if (charity.stripeCustomerId !== customerId) {
        return "ignored: customer does not match charity";
      }

      const result = await upsertSubscription(sub, charity.id, event.created);
      return `${result}: ${sub.id} → ${sub.status}`;
    }

    case "checkout.session.completed": {
      // Subscription state arrives via customer.subscription.created (full
      // object, same delivery) and the return-page sync — handling it here
      // too would need a Stripe API call and buy nothing.
      return "ignored: handled via subscription events";
    }

    case "invoice.payment_failed": {
      // No entitlement change — the status flip to past_due arrives via
      // customer.subscription.updated, and past_due stays entitled (grace).
      const invoice = event.data.object;
      console.warn(
        `[billing] payment failed for customer ${String(invoice.customer)} (invoice ${invoice.id})`,
      );
      return "noted: payment failed";
    }

    default:
      return `ignored: ${event.type}`;
  }
}
