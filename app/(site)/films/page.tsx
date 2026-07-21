import type { Metadata } from "next";
import Image from "next/image";
import Section from "@/components/layout/Section";
import Steps from "@/components/marketing/Steps";
import Eyebrow from "@/components/marketing/Eyebrow";
import { ButtonLink } from "@/components/ui/Button";
import { CTA_HREF } from "@/lib/site";

export const metadata: Metadata = {
  title: "Yufora Films — documentary storytelling for nonprofits",
  description:
    "A short documentary about the work your nonprofit actually did this year — the story that makes your next campaign land.",
};

export default function FilmsPage() {
  return (
    <>
      <Section tone="dark">
        <div className="grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <Eyebrow>Yufora Films</Eyebrow>
            <h1 className="text-[length:var(--text-display)] leading-[1.08] text-white">
              The story behind your latest impact.
            </h1>
            <p className="mt-6 text-xl text-warm-300">
              Our film team spends a day or two with you and makes a short
              documentary about the work you actually did this year — the
              people, the place, the difference. Then it goes at the top of
              your campaign.
            </p>
            <p className="mt-6 font-display text-2xl text-white">
              A tool asks. A story is why they answer.
            </p>
            <ButtonLink
              href={CTA_HREF}
              size="lg"
              variant="secondary"
              className="mt-8"
            >
              Talk to us about a film
            </ButtonLink>
          </div>
          <Image
            src="/films-hero.jpg"
            alt="Filming on location — trading high-fives with kids between takes"
            width={1000}
            height={1569}
            priority
            sizes="(min-width: 1024px) 400px, 90vw"
            className="mx-auto w-full max-w-sm rounded-xl ring-1 ring-white/10 lg:max-w-none"
          />
        </div>
      </Section>

      <Section labelledBy="films-how">
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

      <Section tone="tint" id="content-packs" labelledBy="packs-heading">
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

      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl">
            Pairs with the shop and contests
          </h2>
          <p className="mt-4 text-warm-700">
            A film is the reason someone stops scrolling; the shop and contests
            are how they act on it. Run them together and the story leads
            straight into the ask — but the film stands on its own, and you can
            book it today.
          </p>
          <ButtonLink href={CTA_HREF} size="lg" className="mt-8">
            Talk to us about a film
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
