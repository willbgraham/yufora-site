import type { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { handleBillingEvent } from "@/lib/stripe-billing-webhook";

/**
 * PLATFORM billing events only (Yufora's own subscriptions) — a separate
 * endpoint from /api/webhooks/stripe with its own signing secret, so
 * Stripe itself enforces the platform/connected traffic split and billing
 * work never touches the hardened donation webhook.
 *
 * Create in the dashboard as an "events on your account" endpoint
 * listening for customer.subscription.* and invoice.payment_failed.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return Response.json(
      { error: "Webhook not configured (STRIPE_BILLING_WEBHOOK_SECRET missing)" },
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
    console.error("[stripe-billing-webhook] signature verification failed", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const result = await handleBillingEvent(event);
    console.info(`[stripe-billing-webhook] ${event.type} → ${result}`);
    return Response.json({ received: true });
  } catch (err) {
    // Non-2xx makes Stripe retry — correct for transient db failures.
    console.error(`[stripe-billing-webhook] ${event.type} failed`, err);
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }
}
