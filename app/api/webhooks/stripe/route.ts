import type { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/stripe-webhook";

/**
 * One endpoint for both platform events (account.updated) and connected-
 * account events (checkout.session.completed on direct charges) — enable
 * "listen to events on connected accounts" when creating the endpoint in
 * the Stripe dashboard.
 *
 * Signature verification is mandatory: without STRIPE_WEBHOOK_SECRET we
 * refuse events rather than trust them.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return Response.json(
      { error: "Webhook not configured (STRIPE_WEBHOOK_SECRET missing)" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    const payload = await req.text();
    event = await stripe().webhooks.constructEventAsync(
      payload,
      signature,
      secret,
    );
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const result = await handleStripeEvent(event);
    console.info(`[stripe-webhook] ${event.type} → ${result}`);
    return Response.json({ received: true });
  } catch (err) {
    // Non-2xx makes Stripe retry — correct for transient db failures.
    console.error(`[stripe-webhook] ${event.type} failed`, err);
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }
}
