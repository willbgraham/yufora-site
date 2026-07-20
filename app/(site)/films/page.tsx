import type { Metadata } from "next";
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
        <div className="max-w-3xl">
          <Eyebrow>Yufora Films</Eyebrow>
          <h1 className="text-[length:var(--text-display)] leading-[1.08] text-white">
            The story behind your latest impact.
          </h1>
          <p className="mt-6 text-xl text-warm-300">
            Our film team spends a day or two with you and makes a short
            documentary about the work you actually did this year — the people,
            the place, the difference. Then it goes at the top of your campaign.
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

      <Section tone="tint">
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
