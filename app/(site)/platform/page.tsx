import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/layout/Section";
import { ButtonLink } from "@/components/ui/Button";
import Eyebrow from "@/components/marketing/Eyebrow";
import SectionHeading from "@/components/marketing/SectionHeading";
import FeatureList from "@/components/marketing/FeatureList";
import Steps from "@/components/marketing/Steps";
import FAQ from "@/components/marketing/FAQ";
import DonorWallDemo from "@/components/marketing/DonorWallDemo";
import LeadForm from "@/components/forms/LeadForm";
import { CTA_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: "The Yufora platform — tools that run on your own site",
  description:
    "A wishlist shop, a live donor wall, and referral contests — nonprofit fundraising tools that run on your own website, with the money going straight into your own account.",
};

export default function Platform() {
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
            Yufora gives nonprofits a wishlist shop and referral contests that
            run on your own website — so your supporters never leave your page,
            and every dollar lands in your account, not ours.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={PRODUCT_CTA_HREF} size="lg">
              {PRODUCT_CTA_LABEL}
            </ButtonLink>
            <ButtonLink href="#how" size="lg" variant="secondary">
              See how it works
            </ButtonLink>
          </div>
          <p className="mt-3 text-sm text-warm-600">
            Free to build. From $19/mo when you go live —{" "}
            <Link href="/pricing" className="text-pink-700 hover:underline">
              see the pricing
            </Link>
            .
          </p>
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
        <div className="mt-12 rounded-xl border border-pink-100 bg-pink-50 px-6 py-8 sm:px-10">
          <p className="font-display text-2xl text-warm-900">
            And you&rsquo;re never alone with the software.
          </p>
          <p className="mt-2 max-w-2xl text-warm-700">
            Most platforms leave you with a help center. Every Yufora account
            comes with a human — a real person who set your shop up, knows your
            organization, and answers when you write.
          </p>
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
          title="Run a referral contest that grows your email list."
          lead="A supporter shares a link, friends join your list, and someone wins a prize — a sweepstakes with free entry, run on your own site, with the legal setup most organizations get wrong built in."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Share links that earn entries",
                body: "Every supporter gets a personal link. Every friend who signs up through it earns them entries — or leaderboard points.",
              },
              {
                title: "Free entry keeps it clean",
                body: "No purchase or donation to enter — the line that keeps a sweepstakes legal, built into how contests run.",
              },
              {
                title: "Official Rules, generated",
                body: "Sponsor details, eligibility, entry period, and how winners are chosen — the disclosures the law actually requires.",
              },
              {
                title: "Every entry joins your list",
                body: "Name, email, and permission to stay in touch, captured on your site — a list you keep and export.",
              },
            ]}
          />
        </div>
        <ButtonLink href="/contests" variant="ghost" className="mt-8">
          More about contests →
        </ButtonLink>
      </Section>

      {/* 6b — Donor wall (the start-here product) */}
      <Section tone="tint" labelledBy="wall-heading">
        <div className="grid items-center gap-8 lg:grid-cols-[3fr_2fr]">
          <div>
            <Eyebrow>New — the donor wall</Eyebrow>
            <h2 id="wall-heading" className="text-3xl sm:text-4xl">
              Not ready to move your donations? Start here.
            </h2>
            <p className="mt-4 text-lg text-warm-700">
              A live wall of giving on your website — total raised, gifts as
              they happen, supporters you choose to honor. Connects{" "}
              <em>read-only</em> to the Stripe you already use. Up in minutes,
              nothing to migrate.
            </p>
            <ButtonLink href="/donor-wall" variant="ghost" className="mt-6">
              How the donor wall works →
            </ButtonLink>
          </div>
          <DonorWallDemo />
        </div>
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
            href="/"
            size="lg"
            variant="secondary"
            className="mt-8"
          >
            Talk to us about a film
          </ButtonLink>
        </div>
      </Section>

      {/* 7b — Done-for-you services */}
      <Section tone="tint" labelledBy="services-heading">
        <SectionHeading
          id="services-heading"
          eyebrow="Services"
          title="Rather have it done for you?"
          lead="The tools are for teams that want control. For everyone else, we do the work — starting now, no software required."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/services#adgrants-heading"
            className="rounded-xl border border-warm-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <h3 className="text-lg text-warm-900">Google Ad Grants</h3>
            <p className="mt-1.5 text-sm text-warm-700">
              $10,000/month in free Google ads — most nonprofits leave it
              unclaimed or get suspended on a technicality. We run it right.
            </p>
          </Link>
          <Link
            href="/services#email-heading"
            className="rounded-xl border border-warm-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <h3 className="text-lg text-warm-900">Email marketing</h3>
            <p className="mt-1.5 text-sm text-warm-700">
              Welcome series, stewardship, year-end appeals — the second email
              most donors never get.
            </p>
          </Link>
          <Link
            href="/#content-packs"
            className="rounded-xl border border-warm-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <h3 className="text-lg text-warm-900">Content packs</h3>
            <p className="mt-1.5 text-sm text-warm-700">
              One day of filming, a year of content — cutdowns and assets from
              your documentary.
            </p>
          </Link>
          <Link
            href="/services#design-heading"
            className="rounded-xl border border-warm-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <h3 className="text-lg text-warm-900">Design Studio</h3>
            <p className="mt-1.5 text-sm text-warm-700">
              Graphics, posters, and merch — with print-on-demand wired to
              your site, no inventory ever.
            </p>
          </Link>
        </div>
        <p className="mt-6 text-sm text-warm-600">
          <Link href="/services" className="text-pink-700 hover:underline">
            All services →
          </Link>{" "}
          Prefer the shop handled too?{" "}
          <Link href="/shop#done-for-you" className="text-pink-700 hover:underline">
            Full e-commerce, set up and managed.
          </Link>
        </p>
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
              "The donor wall is live and self-serve — sign up, connect your existing Stripe, and be up today.",
              "The wishlist shop is live and self-serve too. Build it free, publish when you're ready.",
              "Referral contests are in build. Get in touch and you'll be in the first group to run one.",
              "The services — films, content packs, Ad Grants, email — are live now, quoted per project.",
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

      {/* 9 — Pricing */}
      <Section tone="tint">
        <SectionHeading
          align="center"
          title="What it costs."
          lead="Flat monthly pricing, published in full: $19 for the donor wall, $49 for the wishlist shop, $79 for everything. No setup fee, no annual contract, and nothing taken from donations you'd have received anyway. Free to build — you only pay when you go live."
        />
        <div className="mt-8 text-center">
          <ButtonLink href="/pricing" variant="secondary" size="lg">
            See the pricing
          </ButtonLink>
        </div>
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
                q: "Are referral contests legal to run?",
                a: "Run properly, yes. Free entry with no purchase or donation required makes it a sweepstakes, not a lottery — and clear Official Rules are what regulators expect to see. We generate those rules for your contest and flag anything specific to your state.",
              },
              {
                q: "Who owns the donor and entrant data?",
                a: "You do. We never sell, rent, or share it — not with advertisers, not with other nonprofits, not with anyone.",
              },
              {
                q: "When can we start?",
                a: "Right now, by yourself — the donor wall and the wishlist shop are self-serve. Enter your email, build it, publish when you're ready. Referral contests are still in build, and the services are quoted per project.",
              },
              {
                q: "We're not ready to move our donations. Can we still use Yufora?",
                a: "Yes — start with the donor wall. It connects read-only to the Stripe account you already use and puts live giving activity on your website in minutes. Nothing about your existing donation setup changes.",
              },
              {
                q: "Can you just run everything for us?",
                a: "Yes. Every tool has a done-for-you version: we set up and manage the shop (or a full merchandise store), run your email, and manage your Ad Grant. You approve; we do the work.",
              },
              {
                q: "What does it cost?",
                a: "$19/mo for the donor wall, $49 for the wishlist shop, $79 for everything — flat, month to month, with no setup fee and nothing taken from your donations. Building is free; you pay only when you go live. Services are quoted separately, up front.",
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
