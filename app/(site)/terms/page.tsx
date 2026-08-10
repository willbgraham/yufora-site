import type { Metadata } from "next";
import Section from "@/components/layout/Section";
import Prose from "@/components/marketing/Prose";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using Yufora's website, tools, and services.",
};

export default function TermsPage() {
  return (
    <Section>
      <h1 className="mb-2 text-4xl">Terms</h1>
      <p className="mb-10 text-warm-600">
        Plain-English terms for using Yufora. A counsel-reviewed version will
        replace this before full launch. Last updated July 2026.
      </p>
      <Prose>
        <h2>What Yufora is</h2>
        <p>
          Yufora, LLC provides fundraising tools (the wishlist shop, donor
          walls, contests) and marketing services (films, design, Ad Grants,
          email) for nonprofit organizations. Some tools are in early
          onboarding; where something isn&rsquo;t generally available yet, we
          say so on the site.
        </p>

        <h2>Charity accounts</h2>
        <p>
          When you create an account for your organization, you confirm
          you&rsquo;re authorized to act for it, that the information you
          provide is accurate, and that you have the rights to any content you
          upload — photos, product descriptions, videos. You&rsquo;re
          responsible for activity under your account and for the pages of
          your own website where you embed our widgets.
        </p>

        <h2>Donations and money</h2>
        <p>
          Donations made through a Yufora shop are processed by Stripe on the
          charity&rsquo;s own Stripe account.{" "}
          <strong>
            The charity is the merchant of record; Yufora never holds, routes,
            or controls donated funds
          </strong>{" "}
          and is not a party to the gift. Refunds are between the charity and
          its donor, handled through the charity&rsquo;s Stripe account. Tax
          receipts and acknowledgments are the charity&rsquo;s responsibility;
          Yufora&rsquo;s confirmation emails are not tax documents.
        </p>

        <h2>The donor wall</h2>
        <p>
          Donor names appear publicly only as the donor chose at checkout, or
          — on curated lists — where the charity attests it has the
          supporter&rsquo;s permission. Charities agree to honor removal
          requests from their donors using the tools we provide.
        </p>

        <h2>Read-only Stripe connections</h2>
        <p>
          Where a charity connects an existing Stripe account for the
          standalone donor wall, the connection is read-only and used solely
          to display aggregate and anonymized giving activity. Either side
          can disconnect it at any time.
        </p>

        <h2>Services</h2>
        <p>
          Service work — films, content packs, design, Ad Grants management,
          email marketing, store setup — is quoted up front and confirmed in
          writing before any work or charge. Deliverables and revisions are
          whatever the quote says; no surprise invoices.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Don&rsquo;t use Yufora for anything unlawful, deceptive, or outside
          genuine nonprofit fundraising. We can suspend accounts that put
          donors, charities, or the platform at risk — and we&rsquo;ll tell
          you why if we do.
        </p>

        <h2>The honest disclaimer</h2>
        <p>
          Yufora is provided as-is while we build. We work hard to keep
          everything running and your data safe, but we can&rsquo;t promise
          uninterrupted service, and our liability is limited to what you paid
          us. Nothing on this site is legal advice — contest and fundraising
          rules vary by state, and you should confirm your situation with
          qualified counsel.
        </p>

        <h2>Changes and contact</h2>
        <p>
          If these terms change materially, we&rsquo;ll note it here with a new
          date. Questions:{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>
      </Prose>
    </Section>
  );
}
