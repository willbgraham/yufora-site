import type { Metadata } from "next";
import Section from "@/components/layout/Section";
import SectionHeading from "@/components/marketing/SectionHeading";
import LeadForm from "@/components/forms/LeadForm";
import { BOOK_CALL_URL, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get started",
  description:
    "Tell us what you're planning. Services start right away; the shop is onboarding its first organizations now.",
};

export default function StartPage() {
  return (
    <Section labelledBy="start-heading">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          as="h1"
          id="start-heading"
          title="Let's get started."
          lead="Tell us what you're planning. The services — films, content packs, Ad Grants, email — start right away; the shop is onboarding its first organizations now. A real person replies within two business days."
        />
        <p className="mt-4 text-warm-600">
          Prefer to talk it through?{" "}
          {BOOK_CALL_URL ? (
            <a
              href={BOOK_CALL_URL}
              target="_blank"
              rel="noopener"
              className="text-pink-700 hover:underline"
            >
              Book 20 minutes with us
            </a>
          ) : (
            <a
              href={`mailto:${siteConfig.email}?subject=${encodeURIComponent("Let's talk — Yufora")}`}
              className="text-pink-700 hover:underline"
            >
              email us at {siteConfig.email}
            </a>
          )}{" "}
          — sometimes a conversation beats a form.
        </p>
        <div className="mt-10 rounded-xl border border-warm-200 bg-white p-6 sm:p-8">
          <LeadForm />
        </div>
      </div>
    </Section>
  );
}
