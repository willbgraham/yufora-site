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
/** Appends query params to a charity-site URL without clobbering existing ones. */
function withParams(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const productId = String(formData.get("productId") ?? "");
  const mode = String(formData.get("mode") ?? "");
  // Where the donor is giving from: the charity's embedded shop or our
  // hosted page. Determines where Stripe sends them back afterwards.
  const context = formData.get("context") === "embed" ? "embed" : "hosted";

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

  // Keep the "runs on your website" promise: donations made through the
  // embed return the donor to the charity's own page (when configured),
  // where embed.js re-opens the item and shows the thank-you.
  let successUrl = `${productUrl}?donated=1`;
  let cancelUrl = productUrl;
  if (context === "embed" && charity.embedPageUrl) {
    try {
      successUrl = withParams(charity.embedPageUrl, {
        yufora_thanks: "1",
        yufora_item: product.id,
      });
      cancelUrl = withParams(charity.embedPageUrl, { yufora_item: product.id });
    } catch {
      // Malformed stored URL — fall back to the hosted page.
    }
  }

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
        // Donor-wall consent, decided by the donor on the payment page.
        // Skipping the field means anonymous — the safe default.
        custom_fields: [
          {
            key: "display",
            label: { type: "custom", custom: "Show my support publicly?" },
            type: "dropdown",
            optional: true,
            dropdown: {
              options: [
                { label: "Show my name", value: "name" },
                { label: "Show my name and amount", value: "name_amount" },
                { label: "Keep me anonymous", value: "anonymous" },
              ],
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
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
