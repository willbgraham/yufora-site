import "server-only";
import type Stripe from "stripe";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { giveawayDonations, giveawayEntries } from "../db/schema";
import { sendBonusEntriesThanks } from "./email";
import { creditDonationEntries, lockCampaign, lockEntrant } from "./ledger";
import { entryUrlFor, loadCharityLite } from "./service";

/**
 * Giveaway branch of the Stripe Connect webhook. Dispatched from
 * lib/stripe-webhook.ts BEFORE the product path, on metadata.yuforaKind.
 *
 * Trust model: this endpoint receives validly signed events from EVERY
 * connected account, and metadata is attacker-controllable — a charity can
 * create its own Checkout Session carrying any ids. So, in order:
 *   1. the charity named must own the account that emitted the event;
 *   2. the campaign must belong to that charity, the entrant to that campaign;
 *   3. the donation row must exist — Yufora writes it BEFORE creating the
 *      session, so a sponsor-crafted session has no row and credits nothing;
 *   4. the paid amount must equal the amount Yufora set.
 * Entries are computed from the stored amount and frozen rate, never from
 * metadata. Every step is idempotent (Stripe retries).
 */

function paymentIntentId(s: Stripe.Checkout.Session): string | null {
  return typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null);
}

export async function recordGiveawayCheckout(
  accountId: string | null | undefined,
  s: Stripe.Checkout.Session,
): Promise<string> {
  if (s.payment_status !== "paid") return "giveaway ignored: not paid";
  const meta = s.metadata ?? {};
  const donationId = meta.yuforaDonationId;
  const charityId = meta.yuforaCharityId;
  const campaignId = meta.yuforaCampaignId;
  const entrantId = meta.yuforaEntrantId;
  if (!donationId || !charityId || !campaignId || !entrantId) {
    return "giveaway ignored: missing metadata";
  }
  if (s.mode !== "payment" || s.currency !== "usd" || !s.amount_total) {
    return "giveaway ignored: unexpected session";
  }

  const charity = await loadCharityLite(charityId);
  if (!charity) return "giveaway ignored: unknown charity";
  if (!accountId || accountId !== charity.stripeAccountId) {
    return "giveaway ignored: event account does not match charity";
  }

  const now = new Date();
  const out = await db.transaction(async (tx) => {
    const c = await lockCampaign(tx, campaignId, "share");
    if (!c || c.charityId !== charityId) return { msg: "giveaway ignored: campaign not owned by charity" };
    const entrant = await lockEntrant(tx, entrantId, campaignId);
    if (!entrant) return { msg: "giveaway ignored: entrant not in campaign" };
    const [intent] = await tx
      .select()
      .from(giveawayDonations)
      .where(
        and(
          eq(giveawayDonations.id, donationId),
          eq(giveawayDonations.campaignId, campaignId),
          eq(giveawayDonations.entrantId, entrantId),
          eq(giveawayDonations.charityId, charityId),
        ),
      )
      .for("update");
    if (!intent) return { msg: "giveaway ignored: no Yufora-created intent" };
    if (intent.stripeAccountId !== accountId) return { msg: "giveaway ignored: intent account mismatch" };
    if (intent.stripeCheckoutSessionId && intent.stripeCheckoutSessionId !== s.id) {
      return { msg: "giveaway ignored: session mismatch" };
    }
    if (intent.status !== "pending") return { msg: "duplicate: giveaway donation already recorded" };
    if (s.amount_total !== intent.amountCents) {
      console.error(`[giveaways] amount mismatch on ${intent.id}: paid ${s.amount_total}, expected ${intent.amountCents}`);
      return { msg: "giveaway ignored: amount mismatch" };
    }

    // The session expires at or before the end of entries, so a paid one
    // was paid in time — however late this webhook arrives before the lock.
    const inEntryPeriod = s.expires_at * 1000 <= c.endsAt.getTime();
    const credit = await creditDonationEntries(tx, c, entrant, intent, { inEntryPeriod, now });
    const updated = await tx
      .update(giveawayDonations)
      .set({
        status: "succeeded",
        stripeCheckoutSessionId: s.id,
        stripePaymentIntentId: paymentIntentId(s),
        entriesCredited: credit.credited,
        creditNote: credit.note,
        donorName: s.customer_details?.name ?? null,
        donorEmail: s.customer_details?.email ?? null,
        paidAt: now,
      })
      .where(and(eq(giveawayDonations.id, intent.id), eq(giveawayDonations.status, "pending")))
      .returning({ id: giveawayDonations.id });
    if (updated.length === 0) throw new Error("[giveaways] donation left pending state mid-transaction");
    return {
      msg: `giveaway recorded: ${intent.id} (+${credit.credited})`,
      email: { c, entrant, credit, amountCents: intent.amountCents },
    };
  });

  if ("email" in out && out.email) {
    const { c, entrant, credit, amountCents } = out.email;
    await sendBonusEntriesThanks({
      to: entrant.email,
      firstName: entrant.firstName,
      charityName: charity.name,
      charityReplyTo: charity.ownerEmail,
      prizeName: c.prizeName,
      amountCents,
      credited: credit.credited,
      total: credit.total,
      cap: c.perPersonCap,
      entryUrl: entryUrlFor(c, charity, entrant.id, now.getTime()),
      note: credit.note,
    });
  }
  return out.msg;
}

/** A session that expired unpaid: the intent can never complete. */
export async function recordGiveawayExpired(
  accountId: string | null | undefined,
  s: Stripe.Checkout.Session,
): Promise<string> {
  const donationId = s.metadata?.yuforaDonationId;
  if (!donationId) return "giveaway ignored: missing metadata";
  const rows = await db
    .update(giveawayDonations)
    .set({ status: "expired" })
    .where(
      and(
        eq(giveawayDonations.id, donationId),
        eq(giveawayDonations.status, "pending"),
        eq(giveawayDonations.stripeAccountId, accountId ?? ""),
      ),
    )
    .returning({ id: giveawayDonations.id });
  return rows.length > 0 ? `giveaway expired: ${donationId}` : "giveaway ignored: not pending";
}

/**
 * Returns null when the payment isn't a giveaway donation, so the product
 * refund path runs unchanged. Before the pool locks, a refund voids that
 * donation's bonus entries (freeing the capacity). After the lock the pool
 * is immutable — the refund is logged, never re-drawn.
 */
export async function recordGiveawayRefund(
  accountId: string | null | undefined,
  piId: string,
): Promise<string | null> {
  const [d] = await db
    .select()
    .from(giveawayDonations)
    .where(eq(giveawayDonations.stripePaymentIntentId, piId))
    .limit(1);
  if (!d) return null;
  if (!accountId || accountId !== d.stripeAccountId) return "giveaway ignored: refund account mismatch";
  const now = new Date();
  return db.transaction(async (tx) => {
    const c = await lockCampaign(tx, d.campaignId, "share");
    const refunded = await tx
      .update(giveawayDonations)
      .set({ status: "refunded", refundedAt: now })
      .where(and(eq(giveawayDonations.id, d.id), eq(giveawayDonations.status, "succeeded")))
      .returning({ id: giveawayDonations.id });
    if (refunded.length === 0) return "duplicate: giveaway refund already applied";
    if (c?.status === "live") {
      await tx
        .update(giveawayEntries)
        .set({ status: "void", voidedAt: now, voidReason: "refund" })
        .where(
          and(
            eq(giveawayEntries.donationId, d.id),
            eq(giveawayEntries.status, "active"),
            isNull(giveawayEntries.drawId),
          ),
        );
      await tx.update(giveawayDonations).set({ refundEffect: "voided" }).where(eq(giveawayDonations.id, d.id));
      return `giveaway refunded+voided: ${d.id}`;
    }
    await tx
      .update(giveawayDonations)
      .set({ refundEffect: "post_lock_logged" })
      .where(eq(giveawayDonations.id, d.id));
    return `giveaway refunded after lock (entries immutable): ${d.id}`;
  });
}
