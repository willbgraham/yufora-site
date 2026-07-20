import Link from "next/link";
import CreateCharityForm from "@/components/admin/CreateCharityForm";
import { ButtonLink } from "@/components/ui/Button";
import { getCharityForUser } from "@/lib/data/charity";
import { getProductsForCharity } from "@/lib/data/products";
import { requireSession } from "@/lib/session";

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

  const items = await getProductsForCharity(charity.id);
  const published = items.filter((p) => p.status === "published").length;

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
        <ButtonLink href="/admin/products">Manage products</ButtonLink>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {/* Step 1 — live now */}
        <Link
          href="/admin/products"
          className="rounded-xl border border-warm-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span aria-hidden="true" className="font-display text-3xl text-pink-200">
              1
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                items.length > 0
                  ? "bg-teal-100 text-teal-700"
                  : "bg-pink-100 text-pink-700"
              }`}
            >
              {items.length > 0
                ? `${items.length} product${items.length === 1 ? "" : "s"}, ${published} live`
                : "Start here"}
            </span>
          </div>
          <h2 className="mt-3 text-lg text-warm-900">
            {items.length > 0 ? "Manage your products" : "Add your first product"}
          </h2>
          <p className="mt-1.5 text-sm text-warm-700">
            The things you actually need — photos, a price, and the story
            behind it.
          </p>
        </Link>

        {/* Steps 2 & 3 — next phases */}
        {[
          {
            n: 2,
            title: "Connect Stripe",
            body: "Donations go straight to your own account. We never hold the money.",
          },
          {
            n: 3,
            title: "Embed your shop",
            body: "One snippet to paste into your website, and you're live.",
          },
        ].map((step) => (
          <div
            key={step.n}
            className="rounded-xl border border-warm-200 bg-white p-6"
          >
            <div className="flex items-center justify-between">
              <span aria-hidden="true" className="font-display text-3xl text-pink-200">
                {step.n}
              </span>
              <span className="rounded-full bg-warm-100 px-2.5 py-0.5 text-xs font-medium text-warm-600">
                Coming next
              </span>
            </div>
            <h2 className="mt-3 text-lg text-warm-900">{step.title}</h2>
            <p className="mt-1.5 text-sm text-warm-700">{step.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-warm-600">
        You&rsquo;re one of the first organizations in. Stripe and the embed
        are being built next — you&rsquo;ll see them appear here as they land.
      </p>
    </div>
  );
}
