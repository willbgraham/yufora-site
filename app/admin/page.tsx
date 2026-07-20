import Link from "next/link";
import { connectStripe } from "@/app/actions/stripe";
import CreateCharityForm from "@/components/admin/CreateCharityForm";
import { Button, ButtonLink } from "@/components/ui/Button";
import { getCharityForUser } from "@/lib/data/charity";
import { getTotalsForCharity } from "@/lib/data/contributions";
import { getProductsForCharity } from "@/lib/data/products";
import { formatCents } from "@/lib/money";
import { isStripeConfigured } from "@/lib/stripe";
import { requireSession } from "@/lib/session";

function StepBadge({
  tone,
  children,
}: {
  tone: "todo" | "done" | "soon";
  children: React.ReactNode;
}) {
  const classes = {
    todo: "bg-pink-100 text-pink-700",
    done: "bg-teal-100 text-teal-700",
    soon: "bg-warm-100 text-warm-600",
  }[tone];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {children}
    </span>
  );
}

export default async function AdminPage() {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);

  if (!charity) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-warm-200 bg-white p-8">
        <h1 className="text-2xl">Welcome to Yufora.</h1>
        <p className="mt-2 text-warm-700">
          Let&rsquo;s set up your shop. First, what&rsquo;s your organization
          called?
        </p>
        <CreateCharityForm />
      </div>
    );
  }

  const [items, totals] = await Promise.all([
    getProductsForCharity(charity.id),
    getTotalsForCharity(charity.id),
  ]);
  const published = items.filter((p) => p.status === "published").length;

  const stripeReady = isStripeConfigured();
  const stripeState = !charity.stripeAccountId
    ? "none"
    : charity.stripeChargesEnabled
      ? "connected"
      : "incomplete";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">{charity.name}</h1>
          <p className="mt-1 text-sm text-warm-600">
            Your shop:{" "}
            <Link
              href={`/s/${charity.slug}`}
              className="font-mono text-pink-700 hover:underline"
            >
              yufora.com/s/{charity.slug}
            </Link>
          </p>
        </div>
        {totals.count > 0 && (
          <Link
            href="/admin/contributions"
            className="rounded-xl border border-warm-200 bg-white px-5 py-3 text-right transition-shadow hover:shadow-md"
          >
            <span className="block text-2xl font-medium text-warm-900">
              {formatCents(totals.totalCents)}
            </span>
            <span className="text-sm text-warm-600">
              raised · {totals.count} gift{totals.count === 1 ? "" : "s"}
            </span>
          </Link>
        )}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {/* Step 1 — products */}
        <Link
          href="/admin/products"
          className="rounded-xl border border-warm-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span aria-hidden="true" className="font-display text-3xl text-pink-200">
              1
            </span>
            <StepBadge tone={items.length > 0 ? "done" : "todo"}>
              {items.length > 0
                ? `${items.length} product${items.length === 1 ? "" : "s"}, ${published} live`
                : "Start here"}
            </StepBadge>
          </div>
          <h2 className="mt-3 text-lg text-warm-900">
            {items.length > 0 ? "Manage your products" : "Add your first product"}
          </h2>
          <p className="mt-1.5 text-sm text-warm-700">
            The things you actually need — photos, a price, and the story
            behind it.
          </p>
        </Link>

        {/* Step 2 — Stripe */}
        <div className="rounded-xl border border-warm-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <span aria-hidden="true" className="font-display text-3xl text-pink-200">
              2
            </span>
            <StepBadge
              tone={
                stripeState === "connected"
                  ? "done"
                  : stripeReady
                    ? "todo"
                    : "soon"
              }
            >
              {stripeState === "connected"
                ? "Connected"
                : stripeState === "incomplete"
                  ? "Almost done"
                  : stripeReady
                    ? "Next step"
                    : "Coming soon"}
            </StepBadge>
          </div>
          <h2 className="mt-3 text-lg text-warm-900">Connect Stripe</h2>
          <p className="mt-1.5 text-sm text-warm-700">
            Donations go straight to your own account. We never hold the money.
          </p>
          {stripeReady && stripeState === "none" && (
            <form action={connectStripe} className="mt-4">
              <Button type="submit">Connect Stripe</Button>
            </form>
          )}
          {stripeReady && stripeState === "incomplete" && (
            <ButtonLink href="/admin/stripe/refresh" className="mt-4">
              Finish Stripe setup
            </ButtonLink>
          )}
          {stripeState === "connected" && (
            <Link
              href="/admin/contributions"
              className="mt-4 inline-block text-sm text-pink-700 hover:underline"
            >
              View contributions →
            </Link>
          )}
          {!stripeReady && (
            <p className="mt-4 text-sm text-warm-500">
              Payments are almost ready — we&rsquo;ll email you when this step
              opens.
            </p>
          )}
        </div>

        {/* Step 3 — embed (next phase) */}
        <div className="rounded-xl border border-warm-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <span aria-hidden="true" className="font-display text-3xl text-pink-200">
              3
            </span>
            <StepBadge tone="soon">Coming next</StepBadge>
          </div>
          <h2 className="mt-3 text-lg text-warm-900">Embed your shop</h2>
          <p className="mt-1.5 text-sm text-warm-700">
            One snippet to paste into your website, and you&rsquo;re live.
          </p>
        </div>
      </div>

      <p className="mt-8 text-sm text-warm-600">
        You&rsquo;re one of the first organizations in. The embed is being
        built next — you&rsquo;ll see it appear here when it lands.
      </p>
    </div>
  );
}
