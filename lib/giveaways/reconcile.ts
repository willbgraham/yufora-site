import "server-only";
import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { giveawayDonations } from "../db/schema";
import { stripe } from "../stripe";
import { recordGiveawayCheckout } from "./webhook";

export type RetrieveSession = (
  sessionId: string,
  stripeAccount: string,
) => Promise<Stripe.Checkout.Session>;

const defaultRetrieve: RetrieveSession = (id, stripeAccount) =>
  stripe().checkout.sessions.retrieve(id, {}, { stripeAccount });

/**
 * Before entries lock: settle every donation still marked pending by asking
 * Stripe directly, so a lost or late webhook can't drop paid entries from
 * the pool. Paid sessions are recorded through the same path as the
 * webhook; expired ones are closed. Throws if Stripe can't be reached —
 * the lock then refuses (fail closed) rather than draw without them.
 */
export async function reconcilePendingDonations(
  campaignId: string,
  retrieve: RetrieveSession = defaultRetrieve,
): Promise<{ resolved: number; stillPending: number }> {
  const pending = await db
    .select()
    .from(giveawayDonations)
    .where(and(eq(giveawayDonations.campaignId, campaignId), eq(giveawayDonations.status, "pending")));
  let resolved = 0;
  for (const d of pending) {
    if (!d.stripeCheckoutSessionId) {
      // The session was never created (checkout failed after the intent
      // row was written): nothing can ever be paid against it.
      await db
        .update(giveawayDonations)
        .set({ status: "expired" })
        .where(and(eq(giveawayDonations.id, d.id), eq(giveawayDonations.status, "pending")));
      resolved++;
      continue;
    }
    const s = await retrieve(d.stripeCheckoutSessionId, d.stripeAccountId);
    if (s.status === "complete" && s.payment_status === "paid") {
      await recordGiveawayCheckout(d.stripeAccountId, s);
      resolved++;
    } else if (s.status === "expired") {
      await db
        .update(giveawayDonations)
        .set({ status: "expired" })
        .where(and(eq(giveawayDonations.id, d.id), eq(giveawayDonations.status, "pending")));
      resolved++;
    }
  }
  return { resolved, stillPending: pending.length - resolved };
}
