import "server-only";
import type Stripe from "stripe";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { charities, contributions, products, user } from "@/lib/db/schema";
import { sendDonorConfirmation } from "@/lib/donor-email";
import { siteConfig } from "@/lib/site";

/**
 * Pure event handling, separated from signature verification so it can be
 * tested with synthetic events. Everything here is idempotent — Stripe
 * retries webhooks, and the same event must never double-count.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<string> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "paid") return "ignored: not paid";

      const productId = session.metadata?.yuforaProductId;
      const charityId = session.metadata?.yuforaCharityId;
      const amount = session.amount_total;
      if (!productId || !charityId || !amount) return "ignored: missing metadata";

      // Idempotency: the unique session id makes replays insert nothing.
      const inserted = await db
        .insert(contributions)
        .values({
          productId,
          charityId,
          amountCents: amount,
          donorName: session.customer_details?.name ?? null,
          donorEmail: session.customer_details?.email ?? null,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent?.id ?? null),
          status: "succeeded",
        })
        .onConflictDoNothing({ target: contributions.stripeCheckoutSessionId })
        .returning({ id: contributions.id });

      if (inserted.length === 0) return "duplicate: already recorded";

      // Progress cache moves only when a new row was actually inserted.
      const [updated] = await db
        .update(products)
        .set({ fundedCents: sql`${products.fundedCents} + ${amount}` })
        .where(eq(products.id, productId))
        .returning({
          title: products.title,
          fundedCents: products.fundedCents,
          goalCents: products.goalCents,
        });

      // The warm confirmation on behalf of the charity (Stripe's own receipt
      // comes from the charity's account). Failures are logged, never thrown —
      // the donation is already recorded.
      const donorEmail = session.customer_details?.email;
      if (donorEmail && updated) {
        const rows = await db
          .select({
            name: charities.name,
            slug: charities.slug,
            embedPageUrl: charities.embedPageUrl,
            ownerEmail: user.email,
          })
          .from(charities)
          .innerJoin(user, eq(charities.ownerUserId, user.id))
          .where(eq(charities.id, charityId))
          .limit(1);
        const charity = rows[0];
        if (charity) {
          // Link the donor to the shop on the CHARITY's own site when it's
          // configured (embed.js re-opens the item there); hosted page as
          // fallback.
          let productUrl = `${siteConfig.url}/s/${charity.slug}/p/${productId}`;
          if (charity.embedPageUrl) {
            try {
              const u = new URL(charity.embedPageUrl);
              u.searchParams.set("yufora_item", productId);
              productUrl = u.toString();
            } catch {
              // keep hosted fallback
            }
          }
          await sendDonorConfirmation({
            donorEmail,
            donorName: session.customer_details?.name ?? null,
            charityName: charity.name,
            charityReplyTo: charity.ownerEmail,
            productTitle: updated.title,
            amountCents: amount,
            productUrl,
            nowFullyFunded: updated.fundedCents >= updated.goalCents,
          });
        }
      }

      return `recorded: ${inserted[0].id}`;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (!paymentIntentId) return "ignored: no payment intent";

      // v1 treats any refund as a full refund of the contribution.
      const updated = await db
        .update(contributions)
        .set({ status: "refunded" })
        .where(
          and(
            eq(contributions.stripePaymentIntentId, paymentIntentId),
            eq(contributions.status, "succeeded"),
          ),
        )
        .returning({
          id: contributions.id,
          productId: contributions.productId,
          amountCents: contributions.amountCents,
        });

      const row = updated[0];
      if (!row) return "ignored: no matching contribution";

      await db
        .update(products)
        .set({
          fundedCents: sql`GREATEST(${products.fundedCents} - ${row.amountCents}, 0)`,
        })
        .where(eq(products.id, row.productId));

      return `refunded: ${row.id}`;
    }

    case "account.updated": {
      const account = event.data.object;
      await db
        .update(charities)
        .set({ stripeChargesEnabled: Boolean(account.charges_enabled) })
        .where(eq(charities.stripeAccountId, account.id));
      return `account synced: ${account.id}`;
    }

    default:
      return `ignored: ${event.type}`;
  }
}
