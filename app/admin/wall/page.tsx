import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import EmbedSnippet from "@/components/admin/EmbedSnippet";
import WallEntryForm from "@/components/admin/WallEntryForm";
import WallEntryList from "@/components/admin/WallEntryList";
import { ButtonLink } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { wallEntries } from "@/lib/db/schema";
import { getCharityForUser } from "@/lib/data/charity";
import { isStripeConfigured } from "@/lib/stripe";
import { requireSession } from "@/lib/session";
import { siteConfig } from "@/lib/site";

export default async function WallAdminPage() {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity) redirect("/admin");

  const entries = await db
    .select()
    .from(wallEntries)
    .where(eq(wallEntries.charityId, charity.id))
    .orderBy(desc(wallEntries.createdAt));

  const oauthReady =
    isStripeConfigured() && Boolean(process.env.STRIPE_CONNECT_CLIENT_ID);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin" className="text-sm text-warm-600 hover:text-pink-700">
        ← Dashboard
      </Link>
      <h1 className="mt-3 text-3xl">Donor wall</h1>
      <p className="mt-2 text-warm-700">
        A live wall for your website — works with the Stripe account you
        already have, no shop required.
      </p>

      <section className="mt-6 rounded-xl border border-warm-200 bg-white p-6">
        <h2 className="text-xl">Live activity</h2>
        {charity.tickerStripeAccountId ? (
          <p className="mt-2 text-sm text-warm-700">
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700">
              Connected
            </span>{" "}
            <span className="ml-1">
              Your Stripe account is connected read-only. The wall shows
              amounts and times — never names or card details — and we
              can&rsquo;t touch anything else.
            </span>
          </p>
        ) : oauthReady ? (
          <>
            <p className="mt-2 text-sm text-warm-700">
              Connect the Stripe account you already use for donations. The
              connection is <strong>read-only</strong>: the wall can see
              amounts and dates, and can never move money.
            </p>
            <ButtonLink href="/admin/ticker/connect" className="mt-4">
              Connect your Stripe (read-only)
            </ButtonLink>
          </>
        ) : (
          <p className="mt-2 text-sm text-warm-500">
            Live activity is almost ready — we&rsquo;ll email you when this
            step opens.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-warm-200 bg-white p-6">
        <h2 className="text-xl">Recognized supporters</h2>
        <p className="mt-2 text-sm text-warm-700">
          Names you add here appear on the wall. Only add supporters who have
          told you it&rsquo;s okay — the wall never takes names from payment
          data.
        </p>
        <div className="mt-4">
          <WallEntryForm />
        </div>
        <div className="mt-6">
          <WallEntryList
            entries={entries.map((e) => ({
              id: e.id,
              name: e.name,
              amountCents: e.amountCents,
            }))}
          />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-warm-200 bg-white p-6">
        <h2 className="text-xl">Put it on your site</h2>
        <p className="mt-2 text-sm text-warm-700">
          Paste this where the wall should appear:
        </p>
        <div className="mt-3">
          <EmbedSnippet
            snippet={`<script src="${siteConfig.url}/embed.js" data-shop="${charity.slug}" data-widget="ticker" async></script>`}
          />
        </div>
        <Link
          href={`/embed/${charity.slug}/ticker`}
          target="_blank"
          className="mt-3 inline-block text-sm text-pink-700 hover:underline"
        >
          Preview the wall →
        </Link>
      </section>
    </div>
  );
}
