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
    "Short documentaries for nonprofits — real people, a real place, the actual work you did this year, cut into a film that opens your appeal.",
  openGraph: {
    title: "Yufora — Short documentaries for nonprofits",
    description:
      "Short documentaries for nonprofits — the film that opens your appeal and makes the ask land.",
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
              Short documentaries for nonprofits — made to be why people give.
            </h1>
            <p className="mt-6 text-xl text-warm-300">
              Real people, a real place, the actual work you did this year, cut
              into a short film that opens your appeal. Not the pitch — the
              reason the pitch lands.
            </p>
            <p className="mt-6 font-display text-2xl text-white">
              A tool asks. A story is why they answer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={CTA_HREF} size="lg">
                Let&rsquo;s make your film
              </ButtonLink>
              <ButtonLink href="#watch" size="lg" variant="secondary">
                Watch a film we made
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
            A film we made.
          </h2>
          <p className="mt-4 text-lg text-warm-700">
            Three minutes with the people a nonprofit serves — the kind of film
            that goes at the top of a campaign and gives donors a reason before
            it ever makes an ask.
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
          How a film comes together
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
              One day of filming.
              <br />A year of content.
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

      {/* 5 — Quiet tools line */}
      <Section tone="tint">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-lg text-warm-700">
            A film gives someone a reason to give. When you&rsquo;re ready, the
            same team builds the tools that make giving easy — a wishlist shop, a
            live donor wall, and skill-based contests, all running on your own
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

      {/* 6 — Final CTA */}
      <Section tone="dark" labelledBy="cta-heading">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="cta-heading" className="text-3xl text-white sm:text-4xl">
            Let&rsquo;s make your film.
          </h2>
          <p className="mt-4 text-lg text-warm-300">
            Tell us about the work you did this year and the campaign it&rsquo;s
            for. We&rsquo;ll figure out the story worth filming — you can book it
            today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href={CTA_HREF} size="lg">
              Let&rsquo;s make your film
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
