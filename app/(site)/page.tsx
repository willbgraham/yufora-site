import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/layout/Section";
import HeroLoopVideo from "@/components/marketing/HeroLoopVideo";
import Steps from "@/components/marketing/Steps";
import Eyebrow from "@/components/marketing/Eyebrow";
import { ButtonLink } from "@/components/ui/Button";
import { CTA_HREF, BOOK_CALL_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Yufora — Short documentaries for nonprofits" },
  description:
    "Yufora Films makes short documentaries for nonprofits — a small crew, a day or two on location, and a film built to open your next fundraising campaign.",
  openGraph: {
    title: "Yufora — Short documentaries for nonprofits",
    description:
      "We film the real work; you raise the money. Short documentaries for nonprofits, shot on location.",
  },
};

// The featured film, shown playable below the hero.
const FEATURED_FILM_EMBED = "https://www.youtube-nocookie.com/embed/6XZaIWSDw8w?rel=0";

export default function Home() {
  return (
    <>
      {/* 1 — Hero */}
      <Section tone="dark">
        <div className="grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <Eyebrow>Yufora Films</Eyebrow>
            <h1 className="text-[length:var(--text-display)] leading-[1.08] text-white">
              We film the real work. You raise the money.
            </h1>
            <p className="mt-6 text-xl text-warm-300">
              A small crew, a day or two on location, and a short documentary
              about the people your nonprofit serves — plus the cutdowns you
              need for email and socials.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="#watch" size="lg">
                Watch the reel
              </ButtonLink>
              <ButtonLink href={CTA_HREF} size="lg" variant="secondary">
                Start a project
              </ButtonLink>
            </div>
          </div>
          <HeroLoopVideo
            src="/films-hero.mp4"
            poster="/films-hero-poster.jpg"
            label="On location with the Yufora film team — being greeted by kids while filming a documentary at an elementary school"
            className="mx-auto w-full max-w-sm lg:max-w-none"
          />
        </div>
      </Section>

      {/* 2 — Featured film */}
      <Section id="watch" labelledBy="watch-heading" className="scroll-mt-20">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Watch</Eyebrow>
          <h2 id="watch-heading" className="text-3xl sm:text-4xl">
            Featured film
          </h2>
          <p className="mt-4 text-lg text-warm-700">
            Shot on location, cut short, and built to open a campaign.
            Here&rsquo;s one we made.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-xl bg-warm-950 shadow-lg ring-1 ring-warm-200">
          <div className="aspect-video w-full">
            <iframe
              className="h-full w-full"
              src={FEATURED_FILM_EMBED}
              title="A short documentary by Yufora Films"
              loading="lazy"
              allow="accelerated-sensors; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      </Section>

      {/* 3 — How a film comes together */}
      <Section tone="tint" labelledBy="films-how">
        <h2 id="films-how" className="max-w-2xl text-3xl sm:text-4xl">
          Our process, start to finish
        </h2>
        <div className="mt-12">
          <Steps
            steps={[
              {
                title: "We learn your story",
                body: "A short call to find the moment worth filming — the family, the project, the turning point from this year.",
              },
              {
                title: "We film with you",
                body: "A day or two on the ground with your team and the people you serve. Minimal disruption, real footage.",
              },
              {
                title: "You get your film",
                body: "A short documentary ready for the top of a campaign page, an appeal email, or your socials — plus cutdowns for each.",
              },
            ]}
          />
        </div>
      </Section>

      {/* 4 — Content packs */}
      <Section id="content-packs" labelledBy="packs-heading" className="scroll-mt-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="packs-heading" className="text-3xl sm:text-4xl">
              One shoot, cut a dozen ways.
            </h2>
            <p className="mt-4 text-lg text-warm-700">
              The documentary is the centerpiece — the content pack is
              everything else your footage can become. One shoot keeps your
              channels fed for months, at a fraction of the cost of filming
              again.
            </p>
          </div>
          <ul className="space-y-3 self-center">
            {[
              ["30-second cuts", "for Instagram, TikTok, and Reels — sized and captioned for each"],
              ["Email headers and loops", "short motion pieces that make appeals feel alive"],
              ["A gala opener", "the two minutes that quiets the room before the ask"],
              ["Quote cards and stills", "pull-quotes and frames, designed for sharing"],
              ["Campaign re-cuts", "the same story, re-edited around your next appeal"],
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
        </div>
      </Section>

      {/* 5 — We measure what the film moves */}
      <Section tone="tint" labelledBy="measure-heading">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="measure-heading" className="text-3xl sm:text-4xl">
              We measure what the film moves.
            </h2>
            <p className="mt-4 text-lg text-warm-700">
              Film companies show you a reel and an award shelf, and that&rsquo;s
              where it ends. We keep watching after delivery: the links your
              film runs behind get tagged, and sixty days in you get a one-page
              results sheet — how the giving page it opens converted, how the
              appeal it anchored got clicked, before and after.
            </p>
            <p className="mt-4 text-warm-700">
              We commit to measuring honestly, not to inventing a lift number.
              If the film moved nothing, the sheet says so — and we&rsquo;ll be
              the first ones asking why.
            </p>
          </div>
          <ul className="space-y-3 self-center">
            {[
              ["Tagged links", "every placement of your film carries its own link, so results are attributable — not guessed"],
              ["Before and after", "the same page, the same audience, compared across the film going live"],
              ["A one-page results sheet", "sixty days in: what the film ran behind, what changed, in plain English"],
              ["Honest comparisons", "measured against your own baseline — never a December spike sold as skill"],
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
        </div>
      </Section>

      {/* 6 — Quiet tools line */}
      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-lg text-warm-700">
            A film gives someone a reason to give. When you&rsquo;re ready, the
            same team builds the tools that make giving easy — a wishlist shop, a
            live donor wall, and referral contests, all running on your own
            website.
          </p>
          <p className="mt-4">
            <Link
              href="/platform"
              className="font-medium text-pink-700 hover:underline"
            >
              See the full Yufora platform →
            </Link>
          </p>
        </div>
      </Section>

      {/* 7 — Final CTA */}
      <Section tone="dark" labelledBy="cta-heading">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="cta-heading" className="text-3xl text-white sm:text-4xl">
            Bring us on location.
          </h2>
          <p className="mt-4 text-lg text-warm-300">
            Tell us where the work happens and who it&rsquo;s for. We&rsquo;ll
            spend a day or two there and cut you a film — plus the pieces to
            share it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href={CTA_HREF} size="lg">
              Start a project
            </ButtonLink>
            {BOOK_CALL_URL && (
              <ButtonLink href={BOOK_CALL_URL} size="lg" variant="secondary">
                Book a call
              </ButtonLink>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
