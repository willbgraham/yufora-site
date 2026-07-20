import type { Metadata } from "next";
import Section from "@/components/layout/Section";
import SectionHeading from "@/components/marketing/SectionHeading";
import FeatureList from "@/components/marketing/FeatureList";
import CTABand from "@/components/marketing/CTABand";
import { ButtonLink } from "@/components/ui/Button";
import Eyebrow from "@/components/marketing/Eyebrow";
import { CTA_HREF, CTA_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Skill-based contests for nonprofits",
  description:
    "Run photo and creative contests on your own website, with the Official Rules and structured judging that keep them legal and on-brand.",
};

export default function ContestsPage() {
  return (
    <>
      <Section tone="tint">
        <div className="max-w-3xl">
          <Eyebrow>Contests</Eyebrow>
          <h1 className="text-[length:var(--text-display)] leading-[1.08]">
            Photo contests that bring new people to your cause.
          </h1>
          <p className="mt-6 text-xl text-warm-700">
            A skill-judged contest gets your supporters creating and sharing —
            and brings their friends to your website. We handle the part most
            organizations get wrong: the rules and the judging.
          </p>
          <ButtonLink href={CTA_HREF} size="lg" className="mt-8">
            {CTA_LABEL}
          </ButtonLink>
        </div>
      </Section>

      <Section labelledBy="c-legal">
        <SectionHeading
          id="c-legal"
          title="Judged on skill — which is what keeps it a contest."
          lead="A contest rewards skill against published criteria. That's the line that separates it from a prize draw, and staying on the right side of it is built into how Yufora contests run."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Official Rules for your contest",
                body: "Sponsor name and address, judging criteria, the judges and their qualifications, and how and when winners are chosen.",
              },
              {
                title: "A published judging rubric",
                body: "Measurable criteria like creativity, technical execution, and relevance to your theme — not a vague “best photo.”",
              },
              {
                title: "Independent judging",
                body: "Structured scoring by named judges keeps chance out of it. Public voting, if used at all, is a tie-breaker.",
              },
              {
                title: "Consent and rights up front",
                body: "Entrants agree to your terms and grant the rights you need when they submit — so you can actually use the winning photos.",
              },
            ]}
          />
        </div>
      </Section>

      <Section tone="tint" labelledBy="c-ig">
        <SectionHeading
          id="c-ig"
          eyebrow="Coming later"
          title="Instagram hashtag entries"
          lead="We're building the ability to pull entries in by hashtag once entrants link their Instagram account. For now, contests collect entries directly on your site — which gives you the entrant's details, consent, and content rights from the start."
        />
      </Section>

      <Section>
        <CTABand
          title="Have a contest idea?"
          body="Tell us the theme and the prize. We'll come back with how the rules and judging would work."
        />
      </Section>
    </>
  );
}
