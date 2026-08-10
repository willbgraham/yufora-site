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
          title="Google gives you $10,000 a month in free ads. Clicks aren't the point."
          lead="Eligible nonprofits get $10,000 every month in free Google search advertising — the Ad Grant. Most agencies that manage it report clicks and “grant utilization,” because free traffic is easy to generate and hard to turn into anything. We run the grant for what it actually does for you."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Eligibility and setup",
                body: "We check your eligibility, handle the application, and build the account the way the grant's rules require.",
              },
              {
                title: "Compliance, kept",
                body: "Google suspends grant accounts that dip below a 5% click-through rate two months running, among other rules. Keeping yours alive and healthy is table stakes — we treat it that way.",
              },
              {
                title: "Conversions, not clicks",
                body: "We report what grant traffic actually did — signups, wishlist gifts, donations — split into searches for your name versus searches we won you. Spending the free budget on junk queries isn't value, and we won't dress it up as value.",
              },
              {
                title: "A report you can read",
                body: "One page, monthly, plain English: what ran, what it did, what we're changing. No dashboard homework.",
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
          lead="Sector studies put it plainly: barely half of nonprofits send a welcome email within two days of a first gift, fewer than one in ten emails comes from a human sender, and only about 19% of first-time donors ever give again. The basics are broken almost everywhere — which is exactly why fixing them pays. We write and run the email that keeps supporters close, in your voice, under your brand."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Welcome series",
                body: "The first three emails a new supporter gets — who you are, what their money did, what's next. Sent from a person, within days, because that alone puts you ahead of most of the sector.",
              },
              {
                title: "Stewardship that doesn't ask",
                body: "Monthly impact notes that give donors a reason to stay before you ask them to give again.",
              },
              {
                title: "Year-end and GivingTuesday appeals",
                body: "The season when most giving happens, planned and written before the rush — every email pointing at a real item with a live progress bar.",
              },
              {
                title: "Measured in money, not opens",
                body: "We report revenue per thousand emails sent against the sector's ~$54 benchmark, and how many first-time donors gave a second gift against the sector's 19%. We don't report open rates — Apple's mail privacy broke them in 2021, and they mostly count machines.",
              },
            ]}
          />
        </div>
      </Section>

      <Section labelledBy="design-heading">
        <SectionHeading
          id="design-heading"
          eyebrow="Design Studio"
          title="Graphics, posters, and merch your supporters actually want."
          lead="Campaign visuals that look like they cost more than they did — and merchandise without a single box in anyone's garage. Every design job is quoted fixed, with a delivery date, before we start. The custom-design market rarely gives you either."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Campaign graphics and posters",
                body: "Appeal visuals, event posters, social assets, banners — designed to your brand, sized for wherever they're going.",
              },
              {
                title: "Merch, designed for you",
                body: "T-shirts, totes, mugs, calendars — designs your supporters will actually wear, not just tolerate.",
              },
              {
                title: "Print-on-demand, wired to your site",
                body: "We connect Printify or Printful to your website: each item is printed and shipped when someone orders it. No inventory, no minimums, no money tied up in boxes.",
              },
              {
                title: "Hassle-free from day one",
                body: "We set up the store, load the designs, and hand you the keys — sales run themselves.",
              },
            ]}
          />
        </div>
      </Section>

      <Section tone="tint" labelledBy="reporting-heading">
        <div className="grid gap-10 lg:grid-cols-2">
          <SectionHeading
            id="reporting-heading"
            eyebrow="How we report"
            title="Every service reports the same way: money first."
            lead="Once a month, one page you can forward to your board unedited. It leads with dollars and donors, compares your numbers to published sector benchmarks — M+R, the Fundraising Effectiveness Project — and names what we're changing next. If a number is bad, it says so."
          />
          <div className="self-center">
            <h3 className="font-display text-lg text-warm-900">
              Metrics we won&rsquo;t sell you
            </h3>
            <ul className="mt-3 space-y-3">
              {[
                ["Open rates", "Apple's mail privacy auto-fires them — they count machines, not people."],
                ["Impressions and reach", "Being technically on a screen isn't an outcome."],
                ["Follower counts", "Your mission doesn't cash followers."],
                ["Raw traffic", "Visitors who don't give, join, or come back are a chart, not progress."],
                ["Grant “utilization”", "Spending $10,000 of free budget on junk searches isn't $10,000 of value."],
              ].map(([title, body]) => (
                <li
                  key={title}
                  className="rounded-lg border border-warm-200 bg-white px-5 py-3.5"
                >
                  <span className="font-medium text-warm-900">{title}</span>{" "}
                  <span className="text-warm-700">— {body}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-warm-600">
              If a report leads with any of these, ask what it&rsquo;s hiding.
              Ours lead with money.
            </p>
          </div>
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
            href="/#content-packs"
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
