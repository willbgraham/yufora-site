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
} from "@/lib/billing";
import { getCharityForUser } from "@/lib/data/charity";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

const STATUS_COPY: Record<string, string> = {
  active: "Active",
  trialing: "Free trial",
  past_due: "Payment issue — please update your card",
};

export default async function BillingPage() {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity) redirect("/admin");

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

  if (entitlements.reason === "exempt") {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-teal-100 bg-teal-50 p-8">
        <h1 className="text-2xl">Billing</h1>
        <p className="mt-2 text-warm-700">
          You&rsquo;re on a founding plan — every Yufora tool is included,
          on us. Thanks for going first.
        </p>
      </div>
    );
  }

  if (entitlements.reason === "subscribed") {
    const planLabel =
      entitlements.plan === "everything"
        ? "Everything"
        : entitlements.plan === "shop"
          ? "Wishlist Shop"
          : entitlements.plan === "donor-wall"
            ? "Donor Wall"
            : entitlements.plan === "contests"
              ? "Referral Contests"
              : "Subscribed";
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl">Billing</h1>
        <div className="mt-6 rounded-xl border border-warm-200 bg-white p-6">
          <p className="text-sm text-warm-600">Current plan</p>
          <p className="mt-1 text-xl font-medium text-warm-900">{planLabel}</p>
          {entitlements.status && (
            <p
              className={`mt-1 text-sm ${
                entitlements.status === "past_due"
                  ? "text-pink-700"
                  : "text-teal-700"
              }`}
            >
              {STATUS_COPY[entitlements.status] ?? entitlements.status}
            </p>
          )}
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

  // No subscription yet — the plan picker.
  const plans = await getPlansWithAmounts();
  const trialDays = Number(process.env.BILLING_TRIAL_DAYS ?? 0);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl">Choose a plan</h1>
      <p className="mt-2 max-w-xl text-warm-700">
        Flat monthly pricing. No setup fee, no annual contract, and nothing
        taken from donations — ever.
        {trialDays > 0 && (
          <> Every plan starts with {trialDays} days free, no card required.</>
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
            <form
              action={startSubscriptionCheckout.bind(null, plan.key)}
              className="mt-5"
            >
              <Button
                type="submit"
                variant={plan.key === "everything" ? "primary" : "secondary"}
              >
                {trialDays > 0 ? "Start free trial" : "Choose plan"}
              </Button>
            </form>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-warm-600">
        Building and previewing are always free — a plan is only needed to go
        live. Cancel any time from this page.
      </p>
    </div>
  );
}
