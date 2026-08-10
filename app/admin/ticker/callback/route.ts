import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { charities } from "@/lib/db/schema";
import { getCharityForUser } from "@/lib/data/charity";
import { stripe } from "@/lib/stripe";

/** Stripe sends the charity back here after the OAuth screen. */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");
  const charity = await getCharityForUser(session.user.id);
  if (!charity) redirect("/admin");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  // Denied or malformed → back to the dashboard, nothing changed.
  if (!code || state !== charity.id) redirect("/admin");

  try {
    const resp = await stripe().oauth.token({
      grant_type: "authorization_code",
      code,
    });
    if (resp.stripe_user_id) {
      await db
        .update(charities)
        .set({ tickerStripeAccountId: resp.stripe_user_id })
        .where(eq(charities.id, charity.id));
    }
  } catch (err) {
    console.error("[ticker] oauth token exchange failed", err);
  }

  redirect("/admin");
}
