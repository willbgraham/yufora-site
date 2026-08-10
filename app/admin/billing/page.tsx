import { redirect } from "next/navigation";
import {
  openBillingPortal,
  startSubscriptionCheckout,
} from "@/app/actions/billing";
import { Button } from "@/components/ui/Button";
import {
  getEntitlementsForCharity,
  getPlansWithAmounts,
  isBillingConfigured,
  type ProductKey,
} from "@/lib/billing";
import { getCharityForUser } from "@/lib/data/charity";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

type Props = {
  searchParams: Promise<{
    portal?: string;
    error?: string;
    need?: string;
  }>;
};

const PLAN_LABELS: Record<string, string> = {
  everything: "Everything",
  shop: "Wishlist Shop",
  "donor-wall": "Donor Wall",
  contests: "Referral Contests",
};

const PRODUCT_LABELS: Record<ProductKey, string> = {
  shop: "Wishlist Shop",
  donorWall: "Donor Wall",
  contests: "Referral Contests",
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 rounded-lg border border-pink-200 bg-pink-50 px-4 py-3 text-sm text-warm-800">
      {children}
    </p>
  );
}

export default async function BillingPage({ searchParams }: Props) {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity) redirect("/admin");

  const { portal, error, need } = await searchParams;

  if (!isBillingConfigured()) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-warm-200 bg-white p-8">
        <h1 className="text-2xl">Billing</h1>
        <p className="mt-2 text-warm-700">
          Billing isn&rsquo;t set up yet — everything is included while
          we&rsquo;re in early access. Nothing for you to do here.
        </p>
      </div>
    );
  }

  const entitlements = await getEntitlementsForCharity(charity);

  const portalNotice =
    portal === "unavailable" ? (
      <Notice>
        The billing portal is temporarily unavailable. Email{" "}
        <a href="mailto:hello@yufora.com" className="text-pink-700 underline">
          hello@yufora.com
        </a>{" "}
        and we&rsquo;ll update your card or cancel for you — same day.
      </Notice>
    ) : null;

  const errorNotice =
    error === "checkout" ? (
      <Notice>
        We couldn&rsquo;t start checkout just now. Please try again, or email{" "}
        <a href="mailto:hello@yufora.com" className="text-pink-700 underline">
          hello@yufora.com
        </a>
        .
      </Notice>
    ) : null;

  if (entitlements.reason === "exempt") {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl">Billing</h1>
        <div className="mt-6 rounded-xl border border-teal-100 bg-teal-50 p-6">
          <p className="text-warm-800">
            You&rsquo;re on a founding plan — every Yufora tool is included,
            on us. Thanks for going first.
          </p>
        </div>
      </div>
    );
  }

  if (entitlements.reason === "subscribed") {
    const planLabel = entitlements.plan
      ? (PLAN_LABELS[entitlements.plan] ?? "Subscribed")
      : "Subscribed";

    // Bounced here from a gate (publish / connect wall) because the
    // current plan doesn't include that product — say so plainly.
    const neededKey =
      need === "shop" || need === "donorWall" || need === "contests"
        ? (need as ProductKey)
        : null;
    const missingProduct =
      neededKey && !entitlements[neededKey] ? neededKey : null;

    const statusLine = entitlements.cancelAtPeriodEnd ? (
      <p className="mt-1 text-sm text-warm-700">
        Cancellation scheduled — your tools stay live
        {entitlements.currentPeriodEnd
          ? ` until ${formatDate(entitlements.currentPeriodEnd)}`
          : " until the end of this billing period"}
        .
      </p>
    ) : entitlements.status === "past_due" ? (
      <p className="mt-1 text-sm text-pink-700">
        Payment issue — please update your card.
      </p>
    ) : entitlements.status === "trialing" ? (
      <p className="mt-1 text-sm text-teal-700">
        Free trial
        {entitlements.trialEnd
          ? ` — ends ${formatDate(entitlements.trialEnd)}. Add a card via Manage billing to keep everything live.`
          : "."}
      </p>
    ) : (
      <p className="mt-1 text-sm text-teal-700">Active</p>
    );

    return (
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl">Billing</h1>
        <div className="mt-6">
          {portalNotice}
          {errorNotice}
          {missingProduct && (
            <Notice>
              Your {planLabel} plan doesn&rsquo;t include the{" "}
              {PRODUCT_LABELS[missingProduct]}. Use{" "}
              <strong>Manage billing</strong> below to switch to a plan that
              does — Everything covers all of them.
            </Notice>
          )}
        </div>
        <div className="rounded-xl border border-warm-200 bg-white p-6">
          <p className="text-sm text-warm-600">Current plan</p>
          <p className="mt-1 text-xl font-medium text-warm-900">{planLabel}</p>
          {statusLine}
          <form action={openBillingPortal} className="mt-5">
            <Button type="submit" variant="secondary">
              Manage billing
            </Button>
          </form>
          <p className="mt-2 text-xs text-warm-500">
            Update your card, download invoices, change plan, or cancel —
            no phone call, no retention flow.
          </p>
        </div>
      </div>
    );
  }

  // No live subscription — the plan picker. reason is "lapsed" or "none".
  const plans = await getPlansWithAmounts();
  const trialDays = Number(process.env.BILLING_TRIAL_DAYS ?? 0);
  const lapsed = entitlements.reason === "lapsed";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl">{lapsed ? "Restart your plan" : "Choose a plan"}</h1>
      {portalNotice || errorNotice ? (
        <div className="mt-6">
          {portalNotice}
          {errorNotice}
        </div>
      ) : null}
      <p className="mt-2 max-w-xl text-warm-700">
        {lapsed ? (
          <>
            Your plan has ended, so your shop and donor wall are paused for
            visitors. Nothing was deleted — pick a plan and everything comes
            straight back.
          </>
        ) : (
          <>
            Flat monthly pricing. No setup fee, no annual contract, and
            nothing taken from donations — ever.
            {trialDays > 0 && (
              <> Your first plan starts with {trialDays} days free, no card required.</>
            )}
          </>
        )}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`rounded-xl border bg-white p-6 ${
              plan.key === "everything"
                ? "border-pink-300 ring-1 ring-pink-300"
                : "border-warm-200"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg text-warm-900">{plan.label}</h2>
              {plan.amountCents !== null && (
                <p className="text-xl font-medium text-warm-900">
                  {formatCents(plan.amountCents)}
                  <span className="text-sm font-normal text-warm-600">/mo</span>
                </p>
              )}
            </div>
            <p className="mt-1.5 text-sm text-warm-700">{plan.blurb}</p>
            {/* No price, no invitation to buy — an unfetchable price is
                also the one that would fail at checkout. */}
            {plan.amountCents !== null ? (
              <form
                action={startSubscriptionCheckout.bind(null, plan.key)}
                className="mt-5"
              >
                <Button
                  type="submit"
                  variant={plan.key === "everything" ? "primary" : "secondary"}
                >
                  {trialDays > 0 && !lapsed ? "Start free trial" : "Choose plan"}
                </Button>
              </form>
            ) : (
              <p className="mt-5 text-sm text-warm-600">
                Pricing is temporarily unavailable — refresh to try again.
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-warm-600">
        Building and previewing are always free — a plan is only needed to go
        live. Cancel any time from this page.
      </p>

      {/* A cancelled charity still needs its invoice history. */}
      {charity.stripeCustomerId && (
        <form action={openBillingPortal} className="mt-4">
          <Button type="submit" variant="ghost">
            View past invoices
          </Button>
        </form>
      )}
    </div>
  );
}
