import type { Metadata } from "next";
import Section from "@/components/layout/Section";
import SectionHeading from "@/components/marketing/SectionHeading";
import CTABand from "@/components/marketing/CTABand";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Yufora exists: fundraising tools that run on a nonprofit's own website, with the money going straight to them.",
};

export default function AboutPage() {
  return (
    <>
      <Section tone="tint">
        <div className="max-w-3xl">
          <h1 className="text-[length:var(--text-display)] leading-[1.08]">
            Fundraising that belongs to you.
          </h1>
          <p className="mt-6 text-xl text-warm-700">
            Yufora builds tools that run on a nonprofit&rsquo;s own website —
            not on ours — with donations going straight to the organization.
            No middleman holding the money, no borrowed audience, no fine print.
          </p>
        </div>
      </Section>

      <Section labelledBy="about-thesis">
        <SectionHeading
          id="about-thesis"
          title="One idea, a few tools."
          lead="Everything we make does one of two jobs: gives someone a reason to give, or makes it easy when they do."
        />
        <div className="mt-8 max-w-2xl space-y-4 text-warm-700">
          <p>
            The wishlist shop and contests are the tools — ways to ask that live
            on your own site. Yufora Films is the story that makes the ask land.
            They&rsquo;re built to work together, but each one stands on its own.
          </p>
          <p>
            We&rsquo;re early, and we&rsquo;re honest about it. Rather than
            launch loudly and figure it out later, we&rsquo;re building with a
            small first group of nonprofits so the tools fit the way you
            actually work.
          </p>
        </div>
      </Section>

      <Section tone="tint">
        {/* TODO: replace with the founder's real name, photo, and bio —
            with no customers yet, the founder is the trust. */}
        <SectionHeading
          title="Who's behind it"
          lead="Yufora is founded and run by a small team that has spent years around nonprofit fundraising. We'll put real names and faces here shortly — this section is the next thing on our own wishlist."
        />
      </Section>

      <Section>
        <CTABand
          title="Want to help shape it?"
          body="The nonprofits who join now get a real say in what Yufora becomes — and get it first."
        />
      </Section>
    </>
  );
}
