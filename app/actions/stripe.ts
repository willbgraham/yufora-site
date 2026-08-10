"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { charities } from "@/lib/db/schema";
import { getCharityForUser } from "@/lib/data/charity";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { requireSession } from "@/lib/session";
import { siteConfig } from "@/lib/site";

/**
 * Starts (or resumes) Stripe Connect onboarding for the signed-in charity.
 *
 * Standard connected account + Account Links: the charity logs into or
 * creates their OWN Stripe account. Direct charges settle straight to them —
 * the platform never holds funds, and the charity's name is on the donor's
 * card statement.
 */
export async function connectStripe(): Promise<void> {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity) redirect("/admin");
  if (!isStripeConfigured()) redirect("/admin");

  let accountId = charity.stripeAccountId;

  if (!accountId) {
    const account = await stripe().accounts.create({
      type: "standard",
      email: session.user.email,
      business_profile: { name: charity.name },
    });
    accountId = account.id;
    await db
      .update(charities)
      .set({ stripeAccountId: accountId })
      .where(eq(charities.id, charity.id));
  }

  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: `${siteConfig.url}/admin/stripe/return`,
    refresh_url: `${siteConfig.url}/admin/stripe/refresh`,
  });

  redirect(link.url);
}

/**
 * Re-checks the connected account's status with Stripe and caches
 * charges_enabled. Called from the onboarding return page.
 */
export async function syncStripeStatus(): Promise<{
  connected: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
}> {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity?.stripeAccountId || !isStripeConfigured()) {
    return { connected: false, chargesEnabled: false, detailsSubmitted: false };
  }

  const account = await stripe().accounts.retrieve(charity.stripeAccountId);
  const chargesEnabled = Boolean(account.charges_enabled);

  if (chargesEnabled !== charity.stripeChargesEnabled) {
    await db
      .update(charities)
      .set({ stripeChargesEnabled: chargesEnabled })
      .where(eq(charities.id, charity.id));
  }

  return {
    connected: true,
    chargesEnabled,
    detailsSubmitted: Boolean(account.details_submitted),
  };
}
