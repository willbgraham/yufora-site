"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { charities, products } from "@/lib/db/schema";
import { parseDollarsToCents } from "@/lib/money";
import { MIN_CONTRIBUTION_CENTS, isStripeConfigured, stripe } from "@/lib/stripe";
import { siteConfig } from "@/lib/site";

export type CheckoutState =
  | { status: "idle" | "error"; message?: string }
  | { status: "redirect"; url: string };

/**
 * Creates a Stripe Checkout session as a DIRECT charge on the charity's
 * connected account: the charity is the merchant of record, the money
 * settles to their account, and their name is on the donor's statement.
 *
 * No contribution row is written here — the webhook creates it from session
 * metadata when payment completes, keyed by the unique session id. That way
 * abandoned checkouts leave nothing to clean up.
 *
 * Returns the session URL rather than redirect()ing: when the shop runs
 * inside the embed iframe, the client must navigate window.top — Stripe
 * Checkout refuses to render inside a frame.
 */
export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const productId = String(formData.get("productId") ?? "");
  const mode = String(formData.get("mode") ?? "");

  const rows = await db
    .select({ product: products, charity: charities })
    .from(products)
    .innerJoin(charities, eq(products.charityId, charities.id))
    .where(and(eq(products.id, productId), eq(products.status, "published")))
    .limit(1);

  const row = rows[0];
  if (!row) return { status: "error", message: "This item is no longer available." };

  const { product, charity } = row;

  if (
    !isStripeConfigured() ||
    !charity.stripeAccountId ||
    !charity.stripeChargesEnabled
  ) {
    return { status: "error", message: "Donations aren't open yet for this shop." };
  }

  const remaining = product.goalCents - product.fundedCents;
  if (remaining <= 0) {
    return { status: "error", message: "This item is already fully funded — thank you!" };
  }

  let amountCents: number;
  if (mode === "full") {
    amountCents = remaining;
  } else {
    const parsed = parseDollarsToCents(String(formData.get("amount") ?? ""));
    if (parsed === null) {
      return { status: "error", message: "Enter an amount like 25 or 25.50." };
    }
    if (parsed < MIN_CONTRIBUTION_CENTS) {
      return { status: "error", message: "The minimum contribution is $5." };
    }
    // Never let an item overfund: cap at what's left.
    amountCents = Math.min(parsed, remaining);
  }

  const productUrl = `${siteConfig.url}/s/${charity.slug}/p/${product.id}`;

  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        submit_type: "donate",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: amountCents,
              product_data: {
                name: product.title,
                description: `Contribution toward this item for ${charity.name}`,
              },
            },
          },
        ],
        metadata: {
          yuforaProductId: product.id,
          yuforaCharityId: charity.id,
        },
        success_url: `${productUrl}?donated=1`,
        cancel_url: productUrl,
      },
      // The direct-charge part: the session lives on the charity's account.
      { stripeAccount: charity.stripeAccountId },
    );
    if (!session.url) throw new Error("Checkout session has no URL");
    return { status: "redirect", url: session.url };
  } catch (err) {
    console.error("[checkout] session create failed", err);
    return {
      status: "error",
      message: "Couldn't start the donation — please try again in a moment.",
    };
  }
}
