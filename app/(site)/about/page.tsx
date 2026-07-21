import type { Metadata } from "next";
import Image from "next/image";
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

      <Section tone="tint" labelledBy="founder-heading">
        <div className="grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <h2 id="founder-heading" className="text-3xl sm:text-4xl">
              Who&rsquo;s behind it
            </h2>
            <div className="mt-4 space-y-4 text-lg text-warm-700">
              <p>
                Yufora is built by <strong className="text-warm-900">William
                Graham</strong> — a filmmaker and builder who has spent years
                on the ground with nonprofits, camera in hand, telling the
                stories behind their work.
              </p>
              <p>
                Yufora came out of watching the same thing happen everywhere:
                organizations doing remarkable work, asking for support in the
                abstract, with tools that sent their donors somewhere else.
                The fix seemed obvious — show people the real things the work
                needs, on the organization&rsquo;s own website, with the money
                going straight to them.
              </p>
              <p>
                Write to him directly:{" "}
                <a
                  href="mailto:william@yufora.com"
                  className="text-pink-700 hover:underline"
                >
                  william@yufora.com
                </a>
              </p>
            </div>
          </div>
          <Image
            src="/films-hero.jpg"
            alt="William Graham filming on location, trading high-fives with kids between takes"
            width={1000}
            height={1569}
            sizes="(min-width: 1024px) 380px, 80vw"
            className="mx-auto w-full max-w-sm rounded-xl lg:max-w-none"
          />
        </div>
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
