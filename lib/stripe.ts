import "server-only";
import Stripe from "stripe";

/**
 * Same fallback principle as db/email/storage: with no STRIPE_SECRET_KEY the
 * admin shows "not configured" and public fund buttons stay disabled — the
 * site never crashes over missing keys.
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — add it in Vercel project settings (or .env.local for test mode).",
    );
  }
  _stripe ??= new Stripe(key);
  return _stripe;
}

/** Minimum single contribution: $5 (keeps card fees from eating tiny gifts). */
export const MIN_CONTRIBUTION_CENTS = 500;
