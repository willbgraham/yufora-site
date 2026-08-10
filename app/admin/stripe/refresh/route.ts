import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCharityForUser } from "@/lib/data/charity";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { siteConfig } from "@/lib/site";

/**
 * Stripe sends the charity here when an onboarding link expires.
 * Mint a fresh Account Link and send them straight back into onboarding.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const charity = await getCharityForUser(session.user.id);
  if (!charity?.stripeAccountId || !isStripeConfigured()) redirect("/admin");

  const link = await stripe().accountLinks.create({
    account: charity.stripeAccountId,
    type: "account_onboarding",
    return_url: `${siteConfig.url}/admin/stripe/return`,
    refresh_url: `${siteConfig.url}/admin/stripe/refresh`,
  });

  redirect(link.url);
}
