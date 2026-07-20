import Section from "@/components/layout/Section";
import { ButtonLink } from "@/components/ui/Button";
import Eyebrow from "@/components/marketing/Eyebrow";
import SectionHeading from "@/components/marketing/SectionHeading";
import FeatureList from "@/components/marketing/FeatureList";
import Steps from "@/components/marketing/Steps";
import FAQ from "@/components/marketing/FAQ";
import LeadForm from "@/components/forms/LeadForm";
import { CTA_LABEL, CTA_HREF } from "@/lib/site";

export default function Home() {
  return (
    <>
      {/* 1 — Hero */}
      <Section tone="tint" className="!pt-16">
        <div className="max-w-3xl">
          <Eyebrow>Now onboarding our first partner nonprofits</Eyebrow>
          <h1 className="text-[length:var(--text-display-lg)] leading-[1.05]">
            Show your donors exactly what you need.
          </h1>
          <p className="mt-6 max-w-2xl text-xl text-warm-700">
            Yufora gives nonprofits a wishlist shop and skill-based contests that
            run on your own website — so your supporters never leave your page,
            and every dollar lands in your account, not ours.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={CTA_HREF} size="lg">
              {CTA_LABEL}
            </ButtonLink>
            <ButtonLink href="#how" size="lg" variant="secondary">
              See how it works
            </ButtonLink>
          </div>
        </div>
      </Section>

      {/* 2 — Problem */}
      <Section>
        <SectionHeading
          title="Raising money online shouldn't mean sending your donors somewhere else."
          lead="Most fundraising tools hand your supporters a link to a page that isn't yours. The branding changes, the trust dips, and some of them don't finish."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              h: "The wishlist is a spreadsheet.",
              p: "You know you need 20 laptops. Your donors have no way to buy one.",
            },
            {
              h: "The appeal asks for “support.”",
              p: "A number in the abstract is easy to scroll past. A real thing isn't.",
            },
            {
              h: "The gala costs $40k to raise $60k.",
              p: "Events eat a quarter of your year and most of your staff.",
            },
          ].map((c) => (
            <div
              key={c.h}
              className="rounded-lg border border-warm-200 bg-white p-6"
            >
              <p className="text-lg font-medium text-warm-900">{c.h}</p>
              <p className="mt-2 text-warm-700">{c.p}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 3 — Flagship: the Shop */}
      <Section tone="tint" labelledBy="shop-heading">
        <SectionHeading
          id="shop-heading"
          eyebrow="The wishlist shop"
          title="Publish what you actually need. Let donors fund it."
          lead="List real items with real prices. A donor can buy one outright, or chip in toward one and watch it fill up."
        />
        <figure className="my-10 border-l-4 border-pink-500 pl-6">
          <blockquote className="font-display text-2xl text-warm-900 sm:text-3xl">
            A $1,200 laptop. Eleven donors. One laptop.
          </blockquote>
        </figure>
        <FeatureList
          items={[
            {
              title: "Full or partial funding",
              body: "Every item shows how close it is to funded. Small gifts add up to a real thing.",
            },
            {
              title: "It lives on your site",
              body: "Embed it on your homepage or a campaign page. Your logo, your colors, your voice.",
            },
            {
              title: "The donor list is yours",
              body: "Every supporter, exported whenever you like. We never market to your people.",
            },
            {
              title: "Works on a phone",
              body: "Which is where most of your donors will be when they give.",
            },
          ]}
        />
        <ButtonLink href="/shop" variant="ghost" className="mt-8">
          More about the shop →
        </ButtonLink>
      </Section>

      {/* 4 — How it works */}
      <Section id="how" labelledBy="how-heading">
        <SectionHeading
          id="how-heading"
          title="Three steps, and none of them need a developer."
        />
        <div className="mt-12">
          <Steps
            steps={[
              {
                title: "Tell us what you're raising for",
                body: "The items, the goal, the timeline. We help you set it up so it's ready to share.",
              },
              {
                title: "Paste one snippet",
                body: "If your site has an “embed” or “custom HTML” box — Squarespace, WordPress, Wix all do — that's all it takes.",
              },
              {
                title: "Watch it run",
                body: "Gifts come in, money goes to your account, and you see the whole thing from your dashboard.",
              },
            ]}
          />
        </div>
      </Section>

      {/* 5 — Where the money goes */}
      <Section tone="tint">
        <SectionHeading
          eyebrow="Where the money goes"
          title="The money never touches us."
          lead="Donations run through Stripe directly into your organization's own account. Yufora isn't the merchant of record, isn't holding your funds, and isn't a middleman you wait on."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Your Stripe account",
                body: "In your organization's legal name — not a Yufora sub-account.",
              },
              {
                title: "Your name on the statement",
                body: "That's what your donor sees on their card, not ours.",
              },
              {
                title: "Standard payout timing",
                body: "No holds, no reserves, no “pending review.”",
              },
              {
                title: "No wallet, no float",
                body: "There's no balance for us to touch. We couldn't if we wanted to.",
              },
            ]}
          />
        </div>
      </Section>

      {/* 6 — Contests */}
      <Section labelledBy="contests-heading">
        <SectionHeading
          id="contests-heading"
          eyebrow="Contests"
          title="Run a photo contest your supporters actually share."
          lead="Skill-judged competitions — creativity, technique, relevance to a theme — run on your own site. The part most organizations get wrong is the legal setup, so we build it in."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Official Rules, written for your contest",
                body: "Sponsor details, judging criteria, judges, and how winners are chosen — the disclosures the law actually requires.",
              },
              {
                title: "Structured, skill-based judging",
                body: "A published rubric and independent judges keep it a contest, not a game of chance.",
              },
              {
                title: "Entries collected on your site",
                body: "Supporters upload directly, with consent and content rights captured up front.",
              },
              {
                title: "Instagram hashtag entries",
                body: "Coming later — pull entries in by hashtag once entrants link their account.",
              },
            ]}
          />
        </div>
        <ButtonLink href="/contests" variant="ghost" className="mt-8">
          More about contests →
        </ButtonLink>
      </Section>

      {/* 7 — Yufora Films */}
      <Section tone="dark" labelledBy="films-heading">
        <div className="max-w-3xl">
          <Eyebrow>Yufora Films</Eyebrow>
          <h2 id="films-heading" className="text-3xl text-white sm:text-4xl">
            The best campaigns start with a story worth telling.
          </h2>
          <p className="mt-4 text-lg text-warm-300">
            Our film team spends a day or two with you and makes a short
            documentary about the work you actually did this year. Then it goes
            at the top of your campaign, in your appeal email, on your socials —
            the reason someone stops scrolling.
          </p>
          <p className="mt-6 font-display text-2xl text-white">
            A tool asks. A story is why they answer.
          </p>
          <ButtonLink
            href="/films"
            size="lg"
            variant="secondary"
            className="mt-8"
          >
            Talk to us about a film
          </ButtonLink>
        </div>
      </Section>

      {/* 8 — Honest status */}
      <Section labelledBy="status-heading">
        <div className="grid gap-10 md:grid-cols-2">
          <SectionHeading
            id="status-heading"
            title="Where we are right now."
            lead="Yufora is being built. We're working with a small first group of nonprofits to shape it — and we're not going to tell you it's live when it isn't."
          />
          <ul className="space-y-4 self-center">
            {[
              "The wishlist shop is in build. First campaigns run this season.",
              "Contests follow shortly after.",
              "The film team is working now — that one you can book today.",
            ].map((s) => (
              <li
                key={s}
                className="rounded-lg border border-warm-200 bg-warm-50 px-5 py-4 text-warm-800"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* 9 — Pricing posture */}
      <Section tone="tint">
        <SectionHeading
          align="center"
          title="What it will cost."
          lead="We haven't set final pricing, and we won't invent a number to fill this space. What we can commit to now: no setup fee, no annual contract, and nothing taken from donations you'd have received anyway. Early-access organizations see pricing first — and can walk away."
        />
      </Section>

      {/* 10 — FAQ */}
      <Section labelledBy="faq-heading">
        <SectionHeading id="faq-heading" align="center" title="Questions." />
        <div className="mt-10">
          <FAQ
            items={[
              {
                q: "Do we need a developer?",
                a: "No. If your website has a box for “embed” or “custom HTML,” you can paste the snippet in yourself. If not, we'll help.",
              },
              {
                q: "Who actually holds the money?",
                a: "You do. Donations go through Stripe straight into your organization's own account. We never hold your funds.",
              },
              {
                q: "What if an item doesn't fully fund?",
                a: "You decide up front. Most organizations reserve the right to put partial funds toward the same need another way — and we make that clear to donors before they give, so it's never a surprise.",
              },
              {
                q: "Do we have to be a 501(c)(3)?",
                a: "That's the typical case, and it's what Stripe's nonprofit setup expects. Talk to us if your situation is different.",
              },
              {
                q: "Is a photo contest legal to run?",
                a: "A genuine skill-judged contest is on much firmer ground than a prize draw. We build the Official Rules and judging structure that keep it that way, and we'll flag anything specific to your state.",
              },
              {
                q: "Who owns the donor and entrant data?",
                a: "You do. We never sell, rent, or share it — not with advertisers, not with other nonprofits, not with anyone.",
              },
              {
                q: "When can we start?",
                a: "The film service is available now. The shop and contests are onboarding a first group of nonprofits — request early access and we'll tell you the timeline honestly.",
              },
              {
                q: "What does it cost?",
                a: "Pricing isn't final. No setup fee and no annual contract, and early-access organizations see the numbers first.",
              },
            ]}
          />
        </div>
      </Section>

      {/* 11 — Final CTA + inline form */}
      <Section tone="tint" labelledBy="form-heading">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            id="form-heading"
            align="center"
            title="Tell us what you're planning."
            lead="We're taking on a small number of nonprofits for the first round. If you've got a campaign in mind this year, we'd like to hear about it."
          />
          <div className="mt-10 rounded-xl border border-warm-200 bg-white p-6 sm:p-8">
            <LeadForm />
          </div>
        </div>
      </Section>
    </>
  );
}
