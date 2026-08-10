import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/layout/Section";
import SectionHeading from "@/components/marketing/SectionHeading";
import LeadForm from "@/components/forms/LeadForm";
import { ButtonLink } from "@/components/ui/Button";
import {
  BOOK_CALL_URL,
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_LABEL,
  siteConfig,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Get started",
  description:
    "Set the tools up yourself in a few minutes, or tell us what you're planning and we'll do the work for you.",
};

export default function StartPage() {
  return (
    <>
      <Section tone="tint" labelledBy="start-heading">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            as="h1"
            id="start-heading"
            align="center"
            title="Two ways to start."
            lead="The tools you can set up yourself, right now. The services we do for you. Plenty of organizations use both."
          />
        </div>
      </Section>

      <Section labelledBy="paths-heading">
        <h2 id="paths-heading" className="sr-only">
          Choose how to start
        </h2>
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Self-serve */}
          <div className="flex flex-col rounded-xl border border-pink-300 bg-white p-6 ring-1 ring-pink-300 sm:p-8">
            <h3 className="font-display text-2xl text-warm-900">
              Run it yourself
            </h3>
            <p className="mt-2 text-warm-700">
              The donor wall and the wishlist shop are self-serve. Enter your
              email, build the thing, and put it on your site — no call, no
              demo, no waiting on us.
            </p>
            <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm text-warm-700">
              {[
                "Free to build and preview — pay only when you go live",
                "30 days free after that, no card required",
                "From $19/mo, flat. Nothing taken from donations",
                "Cancel yourself, any time, from your dashboard",
              ].map((point) => (
                <li key={point} className="flex gap-2.5">
                  <span aria-hidden="true" className="text-teal-700">
                    ✓
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <ButtonLink href={PRODUCT_CTA_HREF} size="lg" className="mt-6">
              {PRODUCT_CTA_LABEL}
            </ButtonLink>
            <p className="mt-3 text-sm text-warm-600">
              <Link href="/pricing" className="text-pink-700 hover:underline">
                See the pricing →
              </Link>
            </p>
          </div>

          {/* Done-for-you */}
          <div className="flex flex-col rounded-xl border border-warm-200 bg-white p-6 sm:p-8">
            <h3 className="font-display text-2xl text-warm-900">
              Have us do it
            </h3>
            <p className="mt-2 text-warm-700">
              Films and content packs, Google Ad Grants, email marketing,
              design — or the tools above, set up and managed for you. Quoted
              up front, before any work starts.
            </p>
            <p className="mt-4 text-sm text-warm-600">
              Tell us what you&rsquo;re planning and a real person replies
              within two business days.
              {BOOK_CALL_URL ? (
                <>
                  {" "}
                  Prefer to talk?{" "}
                  <a
                    href={BOOK_CALL_URL}
                    target="_blank"
                    rel="noopener"
                    className="text-pink-700 hover:underline"
                  >
                    Book 30 minutes
                  </a>
                  .
                </>
              ) : (
                <>
                  {" "}
                  Or email{" "}
                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="text-pink-700 hover:underline"
                  >
                    {siteConfig.email}
                  </a>
                  .
                </>
              )}
            </p>
            <div className="mt-6">
              <LeadForm />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
