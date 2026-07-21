import type { Metadata } from "next";
import Section from "@/components/layout/Section";
import SectionHeading from "@/components/marketing/SectionHeading";
import FeatureList from "@/components/marketing/FeatureList";
import Steps from "@/components/marketing/Steps";
import CTABand from "@/components/marketing/CTABand";
import { ButtonLink } from "@/components/ui/Button";
import Eyebrow from "@/components/marketing/Eyebrow";
import { CTA_HREF, CTA_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Wishlist shop for nonprofits",
  description:
    "Publish the things your nonprofit actually needs. Donors fund an item fully or chip in toward it — all on your own website, money straight to your account.",
};

export default function ShopPage() {
  return (
    <>
      <Section tone="tint">
        <div className="max-w-3xl">
          <Eyebrow>The wishlist shop</Eyebrow>
          <h1 className="text-[length:var(--text-display)] leading-[1.08]">
            Publish what you need. Let donors fund it.
          </h1>
          <p className="mt-6 text-xl text-warm-700">
            Instead of asking for “support,” show your donors the actual things
            your work depends on — and let them buy one, or chip in toward one.
          </p>
          <ButtonLink href={CTA_HREF} size="lg" className="mt-8">
            {CTA_LABEL}
          </ButtonLink>
        </div>
      </Section>

      <Section labelledBy="shop-how">
        <SectionHeading id="shop-how" title="How the shop works" />
        <div className="mt-12">
          <Steps
            steps={[
              {
                title: "Build your list",
                body: "Add each item with a photo, a price, and how many you need. A transit van, 20 laptops, 500 blankets.",
              },
              {
                title: "Embed it",
                body: "Drop one snippet into your site. The shop appears under your branding, on your page.",
              },
              {
                title: "Donors fund items",
                body: "Someone funds a whole laptop, or ten people each chip in. Every item shows its progress toward funded.",
              },
            ]}
          />
        </div>
      </Section>

      <Section tone="tint">
        <figure className="mx-auto max-w-2xl border-l-4 border-pink-500 pl-6">
          <blockquote className="font-display text-3xl text-warm-900">
            A $1,200 laptop. Eleven donors. One laptop.
          </blockquote>
          <figcaption className="mt-4 text-warm-700">
            Partial funding is what makes a wishlist different from a donation
            form — a small gift buys a visible share of a real thing.
          </figcaption>
        </figure>
      </Section>

      <Section labelledBy="shop-why">
        <SectionHeading id="shop-why" title="Why it works" />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Concrete beats abstract",
                body: "“Fund a laptop” converts better than “donate to our program.” Donors can see what their money becomes.",
              },
              {
                title: "The money is yours from the start",
                body: "Stripe pays donations straight into your own account. We never hold funds.",
              },
              {
                title: "You keep the relationship",
                body: "Every donor's details are yours to export and steward. We don't market to them.",
              },
              {
                title: "Honest about partial funding",
                body: "You set what happens if an item over- or under-funds, and donors see it before they give.",
              },
            ]}
          />
        </div>
      </Section>

      <Section tone="tint" id="done-for-you" labelledBy="dfy-heading">
        <SectionHeading
          id="dfy-heading"
          eyebrow="The done-for-you alternative"
          title="Or don't run it yourself at all."
          lead="The wishlist shop is built for organizations that want to run their own. If nobody on your team has the time, we'll do the whole thing as a service."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Full setup",
                body: "We build the shop, load your items, write the descriptions, and get the embed live on your website.",
              },
              {
                title: "Ongoing management",
                body: "New items added, funded ones celebrated and retired, photos kept fresh — you approve, we do.",
              },
              {
                title: "A full store, if you sell things too",
                body: "T-shirts, calendars, event tickets — we set up and manage real merchandise e-commerce alongside the wishlist.",
              },
              {
                title: "Your money, still yours",
                body: "Managed doesn't mean middleman: donations and sales still settle directly to your own accounts.",
              },
            ]}
          />
        </div>
      </Section>

      <Section>
        <CTABand
          title="Want to see it with your own wishlist?"
          body="Tell us the five things you'd put on it first — or tell us to do the whole thing for you. Either way, we'll show you how it would look on your site."
        />
      </Section>
    </>
  );
}
