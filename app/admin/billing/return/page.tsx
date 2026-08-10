import Link from "next/link";
import { syncSubscriptionStatus } from "@/app/actions/billing";
import { ButtonLink } from "@/components/ui/Button";

type Props = { searchParams: Promise<{ session_id?: string }> };

/**
 * Landing page after Stripe Checkout. The webhook usually arrives second,
 * so we sync the subscription state here — mirroring the Connect
 * onboarding return page — and the stale-event guard keeps the two
 * writers consistent.
 */
export default async function BillingReturnPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams;
  const result = sessionId
    ? await syncSubscriptionStatus(sessionId)
    : { ok: false };

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-warm-200 bg-white p-8">
      {result.ok ? (
        <>
          <h1 className="text-2xl">You&rsquo;re all set.</h1>
          <p className="mt-2 text-warm-700">
            Your plan is active. Publish your products and go live — and
            thank you for building with Yufora.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/admin/products">Go to products</ButtonLink>
            <ButtonLink href="/admin" variant="secondary">
              Dashboard
            </ButtonLink>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-2xl">Almost there.</h1>
          <p className="mt-2 text-warm-700">
            We couldn&rsquo;t confirm the subscription just now. It usually
            lands within a minute — check{" "}
            <Link href="/admin/billing" className="text-pink-700 hover:underline">
              your billing page
            </Link>{" "}
            shortly, or email hello@yufora.com if it doesn&rsquo;t appear.
          </p>
        </>
      )}
    </div>
  );
}
