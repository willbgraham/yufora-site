import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/layout/Container";
import SignOutButton from "@/components/admin/SignOutButton";
import { getEntitlementsForCharity } from "@/lib/billing";
import { getCharityForUser } from "@/lib/data/charity";
import { requireSession, isStaffEmail } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const staff = isStaffEmail(session.user.email);

  // Billing attention banner, on every admin page rather than just the
  // dashboard: past_due keeps everything live (Stripe's dunning is the
  // grace period) but needs a card; a no-card trial HARD CANCELS at the
  // end, so warn before it does.
  const charity = await getCharityForUser(session.user.id);
  const entitlements = charity
    ? await getEntitlementsForCharity(charity)
    : null;
  const pastDue = entitlements?.status === "past_due";
  const trialEndsSoon = entitlements?.trialEndsSoon ?? false;
  const trialEndLabel = entitlements?.trialEnd
    ? entitlements.trialEnd.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <a
        href="#main"
        className="sr-only rounded-md focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:font-medium focus:text-pink-700 focus:shadow-lg"
      >
        Skip to content
      </a>
      <header className="border-b border-warm-200 bg-white">
        <Container className="flex h-14 items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2"
            aria-label="Yufora admin home"
          >
            <Image
              src="/yufora-wordmark.png"
              alt="Yufora"
              width={1105}
              height={262}
              className="h-5 w-auto"
            />
            <span className="rounded-sm bg-warm-100 px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-warm-600">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {staff && (
              <Link
                href="/admin/news"
                className="rounded-md px-3 py-2 text-sm font-medium text-warm-700 hover:bg-warm-50 hover:text-pink-700"
              >
                Newsroom
              </Link>
            )}
            <span className="hidden text-sm text-warm-600 sm:block">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        </Container>
      </header>
      {(pastDue || trialEndsSoon) && (
        <div className="border-b border-pink-200 bg-pink-50">
          <Container className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            {pastDue ? (
              <>
                <p className="text-warm-800">
                  <span className="font-medium text-pink-700">
                    Your last payment didn&rsquo;t go through.
                  </span>{" "}
                  Everything stays live for now — please update your card.
                </p>
                <Link
                  href="/admin/billing"
                  className="font-medium text-pink-700 hover:underline"
                >
                  Fix payment →
                </Link>
              </>
            ) : (
              <>
                <p className="text-warm-800">
                  <span className="font-medium text-pink-700">
                    Your free trial ends
                    {trialEndLabel ? ` ${trialEndLabel}` : " soon"}.
                  </span>{" "}
                  Add a card to keep your tools live.
                </p>
                <Link
                  href="/admin/billing"
                  className="font-medium text-pink-700 hover:underline"
                >
                  Add a card →
                </Link>
              </>
            )}
          </Container>
        </div>
      )}
      <main id="main" className="flex-1 py-10">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
