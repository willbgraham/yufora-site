import Link from "next/link";
import { syncStripeStatus } from "@/app/actions/stripe";
import { ButtonLink } from "@/components/ui/Button";

/** Where Stripe sends the charity back after onboarding. */
export default async function StripeReturnPage() {
  const status = await syncStripeStatus();

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-warm-200 bg-white p-8 text-center">
      {status.chargesEnabled ? (
        <>
          <h1 className="text-2xl text-teal-700">Stripe is connected.</h1>
          <p className="mt-3 text-warm-700">
            Donations now go straight to your organization&rsquo;s own Stripe
            account. You&rsquo;re ready to take contributions.
          </p>
        </>
      ) : status.detailsSubmitted ? (
        <>
          <h1 className="text-2xl">Almost there.</h1>
          <p className="mt-3 text-warm-700">
            Stripe has your details and is finishing its checks — this usually
            takes a few minutes. Check back shortly.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl">Setup isn&rsquo;t finished yet.</h1>
          <p className="mt-3 text-warm-700">
            Stripe still needs a few details before donations can flow.
          </p>
          <Link
            href="/admin/stripe/refresh"
            className="mt-4 inline-block text-pink-700 hover:underline"
          >
            Continue Stripe setup →
          </Link>
        </>
      )}
      <ButtonLink href="/admin" variant="secondary" className="mt-6">
        Back to dashboard
      </ButtonLink>
    </div>
  );
}
