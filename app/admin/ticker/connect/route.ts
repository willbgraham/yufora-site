import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCharityForUser } from "@/lib/data/charity";
import { siteConfig } from "@/lib/site";

/**
 * Sends the charity to Stripe's OAuth screen to connect their EXISTING
 * Stripe account — read_only scope: the standalone wall can see charge
 * amounts and dates, and can never move money or read anything it
 * doesn't need. That asymmetry is the product's trust pitch.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");
  const charity = await getCharityForUser(session.user.id);
  if (!charity) redirect("/admin");

  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) redirect("/admin");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_only",
    redirect_uri: `${siteConfig.url}/admin/ticker/callback`,
    state: charity.id,
  });

  redirect(`https://connect.stripe.com/oauth/authorize?${params.toString()}`);
}
