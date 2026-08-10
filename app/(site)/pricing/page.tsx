import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/layout/Section";
import SectionHeading from "@/components/marketing/SectionHeading";
import Eyebrow from "@/components/marketing/Eyebrow";
import FAQ from "@/components/marketing/FAQ";
import { ButtonLink } from "@/components/ui/Button";
import {
  CTA_HREF,
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_LABEL,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Flat monthly pricing for nonprofit fundraising tools. No setup fee, no annual contract, and nothing taken from your donations — ever.",
};

/**
 * Marketing copy, not the billing source of truth — the amounts charged
 * come from the Stripe Prices behind STRIPE_PRICE_* (see lib/billing.ts).
 * Keep the two in step when re-pricing.
 */
const PLANS = [
  {
    name: "Donor wall",
    price: "$19",
    tagline: "Live giving on your website.",
    href: "/donor-wall",
    available: true,
    points: [
      "Money raised this month, updating live",
      "Gifts as they happen — anonymous by design",
      "Recognized supporters you curate",
      "Read-only link to the Stripe you already use",
    ],
  },
  {
    name: "Wishlist shop",
    price: "$49",
    tagline: "Fund the things you actually need.",
    href: "/shop",
    available: true,
    points: [
      "Real items, real prices, full or partial funding",
      "Runs on your own site — donors never leave",
      "Money goes straight to your Stripe account",
      "Your donor list, exportable any time",
    ],
  },
  {
    name: "Referral contests",
    price: "$39",
    tagline: "Grow your email list.",
    href: "/contests",
    available: false,
    points: [
      "Personal share links that earn entries",
      "Random draw or top-referrer leaderboard",
      "Official Rules generated for your contest",
      "Every entry joins a list you keep",
    ],
  },
];

export default function PricingPage() {
  return (
    <>
      <Section tone="tint">
        <div className="max-w-3xl">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="text-[length:var(--text-display)] leading-[1.08]">
            Flat monthly. Nothing taken from your donations.
          </h1>
          <p className="mt-6 text-xl text-warm-700">
            Most fundraising platforms take a cut of every gift, or ask your
            donors for a tip at checkout. We don&rsquo;t do either. You pay one
            predictable price, and every dollar your supporters give lands in
            your account.
          </p>
        </div>
      </Section>

      <Section labelledBy="plans-heading">
        <h2 id="plans-heading" className="sr-only">
          Plans
        </h2>

        <div className="grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="flex flex-col rounded-xl border border-warm-200 bg-white p-6"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg text-warm-900">{plan.name}</h3>
                <p className="font-display text-3xl text-warm-900">
                  {plan.price}
                  <span className="text-base font-normal text-warm-600">
                    /mo
                  </span>
                </p>
              </div>
              <p className="mt-1 text-sm text-warm-700">{plan.tagline}</p>
              <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm text-warm-700">
                {plan.points.map((point) => (
                  <li key={point} className="flex gap-2.5">
                    <span aria-hidden="true" className="text-teal-700">
                      ✓
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              {plan.available ? (
                <ButtonLink
                  href={PRODUCT_CTA_HREF}
                  variant="secondary"
                  className="mt-6"
                >
                  {PRODUCT_CTA_LABEL}
                </ButtonLink>
              ) : (
                <p className="mt-6 rounded-md bg-warm-50 px-3 py-2.5 text-center text-sm text-warm-600">
                  In build —{" "}
                  <Link href={CTA_HREF} className="text-pink-700 hover:underline">
                    join the first group
                  </Link>
                </p>
              )}
            </div>
          ))}
        </div>

        {/* The bundle, given its own weight. */}
        <div className="mt-5 rounded-xl border border-pink-300 bg-pink-50 p-6 ring-1 ring-pink-300 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div>
              <h3 className="text-xl text-warm-900">Everything</h3>
              <p className="mt-1 text-warm-700">
                All three tools, one flat number — about 26% less than buying
                them separately.
              </p>
            </div>
            <p className="font-display text-4xl text-warm-900">
              $79
              <span className="text-base font-normal text-warm-600">/mo</span>
            </p>
          </div>
          <p className="mt-4 text-sm text-warm-700">
            Referral contests aren&rsquo;t built yet, so until they ship
            it&rsquo;s <strong>$59/mo</strong> for the donor wall and the
            wishlist shop — and it becomes the full $79 plan when contests
            launch. No surprise re-pricing.
          </p>
          <ButtonLink href={PRODUCT_CTA_HREF} size="lg" className="mt-6">
            {PRODUCT_CTA_LABEL}
          </ButtonLink>
        </div>
      </Section>

      <Section tone="tint" labelledBy="free-heading">
        <SectionHeading
          id="free-heading"
          eyebrow="What&rsquo;s free"
          title="Build the whole thing before you pay anything."
          lead="Create your account, add your items, connect Stripe, style it, and preview it on your own site — all free. A plan is only needed at the moment you go live for the public. And your first plan starts with 30 days free, no card required."
        />
        <div className="mt-8 rounded-xl border border-warm-200 bg-white p-6">
          <p className="font-display text-xl text-warm-900">
            Founding rate — thanks for going first.
          </p>
          <p className="mt-2 max-w-2xl text-warm-700">
            The first 50 organizations get{" "}
            <strong>50% off for their first year</strong>, and keep
            today&rsquo;s rates for as long as they stay with us — even when
            prices change later.
          </p>
        </div>
      </Section>

      <Section labelledBy="compare-heading">
        <SectionHeading
          id="compare-heading"
          title="Why flat, and not a percentage."
          lead="It's the question worth asking, so here's the honest arithmetic."
        />
        <div className="mt-8 max-w-2xl space-y-4 text-warm-700">
          <p>
            Platforms that charge 4% of donations look cheaper right up until
            they aren&rsquo;t. At $1,250 a month raised through your shop, a 4%
            platform costs the same as our $49 — and above that, it keeps
            climbing while our price doesn&rsquo;t. A good year costs you more
            with them and nothing extra with us.
          </p>
          <p>
            The &ldquo;free&rdquo; platforms aren&rsquo;t free either — they
            ask <em>your</em> donors for a tip inside <em>your</em> checkout.
            That money comes out of the same pockets your appeal does, and it
            goes to a software company instead of your work.
          </p>
          <p className="font-medium text-warm-900">
            We&rsquo;d rather charge you a small, boring, predictable amount
            and leave your donors alone.
          </p>
        </div>
      </Section>

      <Section tone="tint" labelledBy="pricing-faq">
        <SectionHeading id="pricing-faq" align="center" title="Questions." />
        <div className="mt-10">
          <FAQ
            items={[
              {
                q: "Is there a setup fee or a contract?",
                a: "No, and no. It's month to month — cancel from your dashboard whenever you like, and nothing is deleted if you do. Your shop simply pauses until you come back.",
              },
              {
                q: "Do you take a percentage of donations?",
                a: "Never. Donations go through Stripe directly into your organization's own account — we're not the merchant of record and we don't hold your money. You'll still pay Stripe's own processing fee, at their discounted nonprofit rate.",
              },
              {
                q: "What happens if we stop paying?",
                a: "Your public shop and wall pause — visitors see a short \"temporarily unavailable\" note rather than a broken page — and everything you built stays exactly where it is. Resubscribe and it's all back, instantly.",
              },
              {
                q: "Do we need a card for the trial?",
                a: "No. Your first plan starts with 30 days free and no card. We'll ask for one before it ends, and tell you clearly when that is.",
              },
              {
                q: "Can we switch plans later?",
                a: "Yes, any time, from your billing page. Start with the donor wall and add the shop when you're ready, or go straight to Everything.",
              },
              {
                q: "What about the services — films, Ad Grants, email?",
                a: "Those are quoted per project, not subscriptions, because the work varies so much. Tell us what you have in mind and we'll come back with a number before anything starts.",
              },
            ]}
          />
        </div>
      </Section>

      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl">Start free, today.</h2>
          <p className="mt-4 text-warm-700">
            No call, no demo, no waiting on us. Enter your email, build your
            shop, and pay only when you&rsquo;re ready to show it to the world.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href={PRODUCT_CTA_HREF} size="lg">
              {PRODUCT_CTA_LABEL}
            </ButtonLink>
            <ButtonLink href={CTA_HREF} size="lg" variant="secondary">
              Talk to us instead
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
