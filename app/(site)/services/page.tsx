import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/layout/Section";
import SectionHeading from "@/components/marketing/SectionHeading";
import FeatureList from "@/components/marketing/FeatureList";
import CTABand from "@/components/marketing/CTABand";
import Eyebrow from "@/components/marketing/Eyebrow";
import { ButtonLink } from "@/components/ui/Button";
import { CTA_HREF, CTA_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Marketing services for nonprofits",
  description:
    "Done-for-you nonprofit marketing: Google Ad Grants management and donor email marketing — run by people, available now.",
};

export default function ServicesPage() {
  return (
    <>
      <Section tone="tint">
        <div className="max-w-3xl">
          <Eyebrow>Services</Eyebrow>
          <h1 className="text-[length:var(--text-display)] leading-[1.08]">
            Marketing help, done for you.
          </h1>
          <p className="mt-6 text-xl text-warm-700">
            Our tools are for organizations that want control. Our services are
            for the ones that want it handled — by people, starting now.
          </p>
          <ButtonLink href={CTA_HREF} size="lg" className="mt-8">
            {CTA_LABEL}
          </ButtonLink>
        </div>
      </Section>

      <Section labelledBy="adgrants-heading">
        <SectionHeading
          id="adgrants-heading"
          eyebrow="Google Ad Grants management"
          title="Google gives you $10,000 a month in free ads. Most nonprofits leave it unclaimed."
          lead="Eligible nonprofits get $10,000 every month in free Google search advertising — the Ad Grant. Most organizations either never apply, or set it up once and let it quietly get suspended for breaking the grant's compliance rules. We run it properly."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Eligibility and setup",
                body: "We check your eligibility, handle the application, and build the account the way the grant's rules require.",
              },
              {
                title: "Compliance upkeep",
                body: "The grant has ongoing rules — click-through minimums, keyword policies — that suspend inactive or sloppy accounts. We keep yours healthy month after month.",
              },
              {
                title: "Ads that point somewhere useful",
                body: "Campaigns aimed at your wishlist items, your appeal pages, your programs — not vanity traffic.",
              },
              {
                title: "A report you can read",
                body: "What ran, what it cost the grant, what it raised. Plain English, monthly.",
              },
            ]}
          />
        </div>
      </Section>

      <Section tone="tint" labelledBy="email-heading">
        <SectionHeading
          id="email-heading"
          eyebrow="Email marketing"
          title="Most donors never get a second email. Yours will."
          lead="The first gift is the hardest to win and the easiest to waste. We write and run the email that keeps supporters close — in your voice, under your brand."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Welcome series",
                body: "The first three emails a new supporter gets — who you are, what their money did, what's next.",
              },
              {
                title: "Stewardship that doesn't ask",
                body: "Monthly impact notes that give donors a reason to stay before you ask them to give again.",
              },
              {
                title: "Year-end and GivingTuesday appeals",
                body: "The season when most giving happens, planned and written before the rush.",
              },
              {
                title: "Wired to your shop",
                body: "Every email can point at a real item with a live progress bar — concrete beats abstract in inboxes too.",
              },
            ]}
          />
        </div>
      </Section>

      <Section labelledBy="more-heading">
        <SectionHeading
          id="more-heading"
          title="Also done for you"
          lead="Two more services live where their products live:"
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/films#content-packs"
            className="rounded-xl border border-warm-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <h3 className="text-lg text-warm-900">Content packs</h3>
            <p className="mt-1.5 text-sm text-warm-700">
              One day of filming, a year of content — cutdowns, clips, and
              assets from your documentary. On the Films page →
            </p>
          </Link>
          <Link
            href="/shop#done-for-you"
            className="rounded-xl border border-warm-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <h3 className="text-lg text-warm-900">
              Full e-commerce, set up and managed
            </h3>
            <p className="mt-1.5 text-sm text-warm-700">
              Don&rsquo;t want to run a shop yourself? We build it and keep it
              running. On the Shop page →
            </p>
          </Link>
        </div>
      </Section>

      <Section tone="tint">
        <CTABand
          title="Tell us what needs doing."
          body="Services start now — no waiting for software. Tell us what you're planning and we'll come back with a straight answer on scope and price."
        />
      </Section>
    </>
  );
}
