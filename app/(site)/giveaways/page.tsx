import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/layout/Section";
import CTABand from "@/components/marketing/CTABand";
import Eyebrow from "@/components/marketing/Eyebrow";
import FAQ from "@/components/marketing/FAQ";
import FeatureList from "@/components/marketing/FeatureList";
import GiveawayDemo from "@/components/marketing/GiveawayDemo";
import SectionHeading from "@/components/marketing/SectionHeading";
import Steps from "@/components/marketing/Steps";
import { ButtonLink } from "@/components/ui/Button";
import { isGiveawaysGoLiveOpen } from "@/lib/giveaways/flags";
import { PRODUCT_CTA_HREF, PRODUCT_CTA_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Prize giveaways for nonprofits",
  description:
    "Run a prize giveaway that raises money: anyone can enter free, donors get bonus entries, the winner is drawn in a way anyone can check, and the Official Rules are written for you.",
};

export default function GiveawaysPage() {
  // Read at build time; flipping the env var already means a redeploy.
  const open = isGiveawaysGoLiveOpen();

  return (
    <>
      {/* 1 — Hero */}
      <Section tone="tint">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>Giveaways</Eyebrow>
            <h1 className="text-[length:var(--text-display)] leading-[1.08]">
              Run a prize giveaway that raises money.
            </h1>
            <p className="mt-6 text-xl text-warm-700">
              Pick a prize and an end date, and put the entry form on your
              website. Anyone can enter free. Donors get bonus entries. When it
              ends, the winner is drawn in a way anyone can check — and the
              Official Rules are written for you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={PRODUCT_CTA_HREF} size="lg">
                {open ? PRODUCT_CTA_LABEL : "Build one free"}
              </ButtonLink>
              <ButtonLink href="#how" size="lg" variant="secondary">
                How it works
              </ButtonLink>
            </div>
            <p className="mt-3 text-sm text-warm-600">
              {open
                ? "Free to build. $49/mo when it goes live, or included in Everything."
                : "Build and preview now. Going live opens once our legal review is complete."}
            </p>
          </div>
          <GiveawayDemo className="mx-auto w-full max-w-md lg:max-w-none" />
        </div>
      </Section>

      {/* 2 — How it runs */}
      <Section id="how" labelledBy="g-how" className="scroll-mt-20">
        <SectionHeading id="g-how" title="How a giveaway runs." />
        <div className="mt-12">
          <Steps
            steps={[
              {
                title: "Set up the prize",
                body: "Add a photo, the prize's value, the dates, and how entries work. Your Official Rules fill in as you go.",
              },
              {
                title: "Put it on your site",
                body: "Paste one snippet, or share the link. People enter with their name and email, and confirm by email.",
              },
              {
                title: "Draw the winner",
                body: "When entries close, click one button. The winner and three alternates are picked using public randomness — and the results page shows the work.",
              },
            ]}
          />
        </div>
      </Section>

      {/* 3 — Bonus entries, honestly */}
      <Section tone="tint" labelledBy="g-bonus">
        <SectionHeading
          id="g-bonus"
          eyebrow="Bonus entries for donors"
          title="Donors get bonus entries. Everyone can enter free."
          lead="This is the part that has to be right, so here's exactly how it works."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Free entry, every day",
                body: "Anyone eligible can enter free once a day. No donation, no purchase.",
              },
              {
                title: "Bonus entries for a donation",
                body: "You set the rate — say, one bonus entry for every $10. The gift goes straight to your Stripe account.",
              },
              {
                title: "One limit for everyone",
                body: "Each person can hold the same maximum number of entries, free or bonus. Yufora won't let you go live with a limit that free entry can't reach.",
              },
              {
                title: "Said next to every donate button",
                body: "“No donation necessary to enter or win” sits beside every donation button, not in a footer.",
              },
            ]}
          />
        </div>
      </Section>

      {/* 4 — A draw anyone can check */}
      <Section labelledBy="g-draw">
        <SectionHeading
          id="g-draw"
          eyebrow="A draw anyone can check"
          title="Nobody chooses the winner — not you, and not us."
          lead="When your giveaway goes live, we publish a sealed fingerprint of the draw. When it ends, a public random number from drand — a randomness service run by an independent group of organizations, published every few seconds — picks the winner. Your results page shows each step, so anyone can redo the math."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Sealed before the first entry",
                body: "A fingerprint of a secret goes public at launch. At the draw, the secret is revealed and anyone can check it matches.",
              },
              {
                title: "Randomness nobody controls",
                body: "The deciding number doesn't exist yet when entries lock — so no one, including Yufora, can know or pick it.",
              },
              {
                title: "A results page for everyone",
                body: "Every input and every step, with a button that re-runs the draw in the visitor's own browser. No names unless the winner says yes.",
              },
              {
                title: "Alternates drawn at the same time",
                body: "Three alternates are picked in the same draw, in order, so if the winner doesn't claim, the prize moves on without a second drawing.",
              },
            ]}
          />
        </div>
      </Section>

      {/* 5 — The legal part */}
      <Section tone="tint" labelledBy="g-rules">
        <SectionHeading
          id="g-rules"
          eyebrow="The rules, handled"
          title="Official Rules, written for your giveaway."
          lead="A giveaway with free entry is a sweepstakes, and sweepstakes need clear rules: who's running it, who can enter, how and until when, what the prize is worth, and how the winner is picked. Yours are built from your settings and locked the moment you go live."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Your organization is the Sponsor",
                body: "Yufora is named as the Administrator that runs the entry form, the emails and the draw.",
              },
              {
                title: "Kept inside the simple lines",
                body: "Prizes stay under $5,000 and entry is open to US residents 18 and older. Bigger prizes trigger registration and bonding in some states, so we don't offer them.",
              },
              {
                title: "Locked at launch",
                body: "Once you go live, the terms can't change — entrants get exactly what they agreed to.",
              },
              open
                ? {
                    title: "Reviewed by a promotions lawyer",
                    body: "Our Rules template was reviewed by counsel. It doesn't replace advice for your situation, but it's a sound starting point.",
                  }
                : {
                    title: "With a promotions lawyer now",
                    body: "Our Rules template is being reviewed by counsel. Going live opens when that review is done.",
                  },
            ]}
          />
        </div>
      </Section>

      {/* 6 — Giveaways vs contests */}
      <Section labelledBy="g-vs">
        <SectionHeading
          id="g-vs"
          title="Giveaways and referral contests are different tools."
          lead={
            <>
              A giveaway raises money: anyone enters free, donors get bonus
              entries, one winner. A referral contest grows your email list:
              people earn entries by bringing friends. Giveaways are{" "}
              {open ? "live now" : "ready to build today"}. Referral contests
              are still in build.
            </>
          }
        />
        <ButtonLink href="/contests" variant="ghost" className="mt-6">
          About referral contests →
        </ButtonLink>
      </Section>

      {/* 7 — Cost (+ status while closed) */}
      <Section tone="tint" labelledBy="g-cost">
        <div className="grid gap-10 md:grid-cols-2">
          <SectionHeading
            id="g-cost"
            title="What it costs."
            lead="$49/mo for Giveaways, or included in Everything. Flat monthly, month to month, and nothing taken from donations. Building and previewing are free — you pay when a giveaway goes live."
          />
          {!open && (
            <div className="self-center rounded-xl border border-warm-200 bg-white p-6">
              <p className="font-display text-xl text-warm-900">
                Ready to build. Going live opens after legal review.
              </p>
              <p className="mt-2 text-warm-700">
                You can create a giveaway today, set every detail, and preview
                both the entry form and your Official Rules. Going live stays
                switched off until a promotions lawyer finishes reviewing our
                Rules template — we&rsquo;ll email you the day it opens.
              </p>
            </div>
          )}
        </div>
        <p className="mt-6 text-sm text-warm-600">
          <Link href="/pricing" className="text-pink-700 hover:underline">
            See all pricing →
          </Link>
        </p>
      </Section>

      {/* 8 — FAQ */}
      <Section labelledBy="g-faq">
        <SectionHeading id="g-faq" align="center" title="Questions." />
        <div className="mt-10">
          <FAQ
            items={[
              {
                q: "Is it legal for a nonprofit to run a giveaway?",
                a: "Yes, when it's run as a sweepstakes: free entry for everyone, a prize, a random winner, and clear Official Rules. That's the shape Yufora enforces. A few things vary by state, which is why we exclude Rhode Island and keep prizes under $5,000.",
              },
              {
                q: "Is this a raffle?",
                a: "No. In a raffle, people pay for a chance to win, and most states only allow that with a license. In a giveaway, anyone can enter free, and someone who never donates can reach the same number of entries as someone who does.",
              },
              {
                q: "Who can enter?",
                a: "Legal residents of the 50 states and DC, except Rhode Island, who are 18 or older (19 in Alabama and Nebraska, 21 in Mississippi). Everyone confirms their entry by email. Your staff and board can't enter.",
              },
              {
                q: "Who provides the prize?",
                a: "You do — your organization is the Sponsor. Yufora runs the entry form, the emails and the draw.",
              },
              {
                q: "What does the winner have to do?",
                a: "Accept the prize by the deadline using the link we email them. You then collect an affidavit of eligibility directly, and a W-9 where the prize's value requires one.",
              },
              {
                q: "Can we change the prize once it's live?",
                a: "No. The prize, dates and entry settings are locked into your Official Rules when you go live, so entrants get exactly what they agreed to.",
              },
              {
                q: "Who gets the entrants' details?",
                a: "You do. People who ticked the box to hear from you are marked, so you only add them to your list. We never market to them and never sell their details.",
              },
              {
                q: "Do we need Stripe?",
                a: "Only for bonus entries. A free-entry-only giveaway needs nothing but the snippet. Donations go straight to your own Stripe account — we take no cut.",
              },
            ]}
          />
        </div>
      </Section>

      {/* 9 — CTA */}
      <Section>
        <CTABand
          title="Set up your first giveaway."
          body={
            open
              ? "Build it free, preview it on your site, and pay only when it goes live."
              : "Build it and preview the entry form and Official Rules today, free. Going live opens once our legal review completes."
          }
          label={open ? PRODUCT_CTA_LABEL : "Build one free"}
          href={PRODUCT_CTA_HREF}
        />
      </Section>
    </>
  );
}
