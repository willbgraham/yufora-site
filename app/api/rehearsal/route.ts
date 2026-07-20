// TEMPORARY test-rehearsal route (preview deployments only; behind Vercel
// SSO/bypass). Lets the rehearsal drive Stripe + seed data from inside the
// deployment, where the sensitive STRIPE_SECRET_KEY lives. Removed after
// the rehearsal — see git history.
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { charities, contributions, products, user } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";

function guard() {
  if (process.env.VERCEL_ENV !== "preview") {
    return Response.json({ error: "preview only" }, { status: 404 });
  }
  return null;
}

const SEED_EMAIL = "william@yufora.com";
const SEED_SLUG = "riverside-animal-rescue";

export async function GET(req: NextRequest) {
  const blocked = guard();
  if (blocked) return blocked;
  const action = req.nextUrl.searchParams.get("action");

  try {
    switch (action) {
      /* Create a fully-provisioned TEST connected account (custom type with
         Stripe's documented test data) so charges are enabled without the
         interactive onboarding — that flow is exercised separately. */
      case "account": {
        const account = await stripe().accounts.create({
          type: "custom",
          country: "US",
          email: SEED_EMAIL,
          business_type: "individual",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            mcc: "8398",
            url: "https://www.yufora.com",
            name: "Riverside Animal Rescue (TEST)",
          },
          individual: {
            first_name: "Test",
            last_name: "Charity",
            email: SEED_EMAIL,
            phone: "0000000000",
            dob: { day: 1, month: 1, year: 1990 },
            address: {
              line1: "address_full_match",
              city: "San Francisco",
              state: "CA",
              postal_code: "94110",
              country: "US",
            },
            id_number: "000000000",
          },
          external_account: {
            object: "bank_account",
            country: "US",
            currency: "usd",
            routing_number: "110000000",
            account_number: "000123456789",
          },
          tos_acceptance: {
            date: Math.floor(Date.now() / 1000),
            ip: "8.8.8.8",
          },
        });
        const fresh = await stripe().accounts.retrieve(account.id);
        return Response.json({
          accountId: account.id,
          chargesEnabled: fresh.charges_enabled,
          requirementsDue: fresh.requirements?.currently_due ?? [],
        });
      }

      /* Seed user + charity + published product into THIS deployment's db
         branch, wiring the given connected account. */
      case "seed": {
        const accountId = req.nextUrl.searchParams.get("account");
        if (!accountId) return Response.json({ error: "account param required" }, { status: 400 });

        const acct = await stripe().accounts.retrieve(accountId);

        let owner = (
          await db.select().from(user).where(eq(user.email, SEED_EMAIL)).limit(1)
        )[0];
        owner ??= (
          await db
            .insert(user)
            .values({ name: "William Graham", email: SEED_EMAIL, emailVerified: true })
            .returning()
        )[0];

        let charity = (
          await db.select().from(charities).where(eq(charities.slug, SEED_SLUG)).limit(1)
        )[0];
        charity ??= (
          await db
            .insert(charities)
            .values({
              name: "Riverside Animal Rescue",
              slug: SEED_SLUG,
              ownerUserId: owner.id,
            })
            .returning()
        )[0];

        await db
          .update(charities)
          .set({
            stripeAccountId: accountId,
            stripeChargesEnabled: Boolean(acct.charges_enabled),
          })
          .where(eq(charities.id, charity.id));

        let product = (
          await db.select().from(products).where(eq(products.charityId, charity.id)).limit(1)
        )[0];
        product ??= (
          await db
            .insert(products)
            .values({
              charityId: charity.id,
              title: "Cozy dog beds (×20)",
              description:
                "Twenty warm, washable beds for the kennel block — winter is rough on concrete floors.",
              goalCents: 150000,
              status: "published",
            })
            .returning()
        )[0];
        await db
          .update(products)
          .set({ status: "published" })
          .where(eq(products.id, product.id));

        return Response.json({
          shopUrl: `/s/${SEED_SLUG}`,
          productUrl: `/s/${SEED_SLUG}/p/${product.id}`,
          chargesEnabled: Boolean(acct.charges_enabled),
        });
      }

      /* Create the Stripe webhook endpoint pointing at the given URL.
         connect: true so events from connected accounts (direct charges)
         arrive here. Returns the signing secret for the env var. */
      case "webhook": {
        const url = req.nextUrl.searchParams.get("url");
        if (!url) return Response.json({ error: "url param required" }, { status: 400 });
        const endpoint = await stripe().webhookEndpoints.create({
          url,
          connect: true,
          enabled_events: [
            "checkout.session.completed",
            "charge.refunded",
            "account.updated",
          ],
        });
        return Response.json({ endpointId: endpoint.id, secret: endpoint.secret });
      }

      /* Current state: product progress + contributions on this branch. */
      case "status": {
        const charity = (
          await db.select().from(charities).where(eq(charities.slug, SEED_SLUG)).limit(1)
        )[0];
        if (!charity) return Response.json({ error: "not seeded" }, { status: 404 });
        const prods = await db
          .select()
          .from(products)
          .where(eq(products.charityId, charity.id));
        const contribs = await db
          .select()
          .from(contributions)
          .where(eq(contributions.charityId, charity.id));
        return Response.json({
          stripeAccountId: charity.stripeAccountId,
          chargesEnabled: charity.stripeChargesEnabled,
          products: prods.map((p) => ({
            id: p.id,
            title: p.title,
            fundedCents: p.fundedCents,
            goalCents: p.goalCents,
          })),
          contributions: contribs.map((c) => ({
            amountCents: c.amountCents,
            status: c.status,
            donorEmail: c.donorEmail,
            paymentIntent: c.stripePaymentIntentId,
          })),
        });
      }

      /* Complete a hosted checkout session's payment with Stripe's test
         payment method (test mode only — skips only Stripe's own card UI). */
      case "pay": {
        const sessionId = req.nextUrl.searchParams.get("session");
        const accountId = req.nextUrl.searchParams.get("account");
        if (!sessionId || !accountId) {
          return Response.json({ error: "session and account params required" }, { status: 400 });
        }
        const session = await stripe().checkout.sessions.retrieve(
          sessionId,
          {},
          { stripeAccount: accountId },
        );
        const piId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;
        if (!piId) {
          return Response.json(
            { error: "session has no payment intent yet", sessionStatus: session.status },
            { status: 409 },
          );
        }
        const pi = await stripe().paymentIntents.confirm(
          piId,
          { payment_method: "pm_card_visa" },
          { stripeAccount: accountId },
        );
        return Response.json({ paymentIntent: pi.id, piStatus: pi.status });
      }

      /* Refund the given payment intent on the connected account. */
      case "refund": {
        const pi = req.nextUrl.searchParams.get("pi");
        const accountId = req.nextUrl.searchParams.get("account");
        if (!pi || !accountId) {
          return Response.json({ error: "pi and account params required" }, { status: 400 });
        }
        const refund = await stripe().refunds.create(
          { payment_intent: pi },
          { stripeAccount: accountId },
        );
        return Response.json({ refundId: refund.id, status: refund.status });
      }

      /* Inspect, delete, and recreate our webhook endpoint as a Connect
         endpoint; returns raw before/after objects for verification. */
      case "fixhook": {
        const oldId = req.nextUrl.searchParams.get("old");
        const url = req.nextUrl.searchParams.get("url");
        if (!oldId || !url) {
          return Response.json({ error: "old and url params required" }, { status: 400 });
        }
        const before = await stripe().webhookEndpoints.retrieve(oldId);
        await stripe().webhookEndpoints.del(oldId);
        const created = await stripe().webhookEndpoints.create({
          url,
          connect: true,
          enabled_events: [
            "checkout.session.completed",
            "charge.refunded",
            "account.updated",
          ],
        });
        return Response.json({ before, created });
      }

      /* Touch the connected account so account.updated fires — a live
         end-to-end test of Connect event delivery. */
      case "poke": {
        const accountId = req.nextUrl.searchParams.get("account");
        if (!accountId) return Response.json({ error: "account param required" }, { status: 400 });
        await stripe().accounts.update(accountId, {
          metadata: { rehearsalPoke: String(Math.floor(Date.now() / 1000)) },
        });
        return Response.json({ poked: accountId });
      }

      /* Runtime env truth: which vars the deployment actually sees.
         Lengths and prefixes only — never values. */
      case "env": {
        const keys = [
          "STRIPE_SECRET_KEY",
          "STRIPE_WEBHOOK_SECRET",
          "BETTER_AUTH_SECRET",
          "NEXT_PUBLIC_SITE_URL",
          "LEAD_NOTIFY_TO",
          "LEAD_NOTIFY_FROM",
          "RESEND_API_KEY",
          "DATABASE_URL",
          "BLOB_STORE_ID",
        ];
        const report: Record<string, string> = {};
        for (const k of keys) {
          const v = process.env[k];
          report[k] =
            v === undefined
              ? "UNDEFINED"
              : v === ""
                ? "EMPTY STRING"
                : `set (len ${v.length}, ${v.slice(0, 4)}…)`;
        }
        return Response.json(report);
      }

      /* Stripe-side truth: recent checkout sessions + events on the
         connected account, with pending webhook-retry counts. */
      case "events": {
        const accountId = req.nextUrl.searchParams.get("account");
        if (!accountId) return Response.json({ error: "account param required" }, { status: 400 });
        const sessions = await stripe().checkout.sessions.list(
          { limit: 5 },
          { stripeAccount: accountId },
        );
        const events = await stripe().events.list(
          { limit: 10, types: ["checkout.session.completed", "charge.refunded"] },
          { stripeAccount: accountId },
        );
        const endpoints = await stripe().webhookEndpoints.list({ limit: 10 });
        return Response.json({
          endpoints: endpoints.data.map((w) => ({
            id: w.id,
            url: w.url.replace(/x-vercel-protection-bypass=[^&]+/, "bypass=…"),
            status: w.status,
            connect: (w as unknown as { connect?: boolean }).connect ?? null,
            enabledEvents: w.enabled_events,
            apiVersion: w.api_version,
          })),
          sessions: sessions.data.map((s) => ({
            id: s.id.slice(0, 20) + "…",
            status: s.status,
            paymentStatus: s.payment_status,
            amount: s.amount_total,
            created: new Date(s.created * 1000).toISOString(),
            metadata: s.metadata,
          })),
          events: events.data.map((e) => ({
            type: e.type,
            created: new Date(e.created * 1000).toISOString(),
            pendingWebhooks: e.pending_webhooks,
          })),
        });
      }

      default:
        return Response.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
