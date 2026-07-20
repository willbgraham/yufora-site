import type { Metadata } from "next";
import Section from "@/components/layout/Section";
import Prose from "@/components/marketing/Prose";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using the Yufora website while it is in early access.",
};

export default function TermsPage() {
  return (
    <Section>
      <h1 className="mb-2 text-4xl">Terms</h1>
      <p className="mb-10 text-warm-600">
        A short set of terms for this website while Yufora is in early access.
        Full product terms will follow, reviewed by counsel, before anything
        goes live.
      </p>
      <Prose>
        <h2>This website</h2>
        <p>
          This site describes tools and services that are still in development.
          Nothing here is a live product yet, and descriptions of features
          reflect what we intend to offer, not a guarantee of current
          availability.
        </p>

        <h2>Early access</h2>
        <p>
          Requesting early access puts you on a list for us to contact. It
          isn&rsquo;t a contract, a purchase, or a commitment on either side.
          Pricing and product terms will be shared before you decide anything.
        </p>

        <h2>No professional advice</h2>
        <p>
          Anything on this site about contest or fundraising rules is general
          information, not legal advice. Requirements vary by state and by
          situation, and you should confirm your own with qualified counsel.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms? Email{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>
      </Prose>
    </Section>
  );
}
