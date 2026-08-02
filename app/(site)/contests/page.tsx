import type { Metadata } from "next";
import Section from "@/components/layout/Section";
import SectionHeading from "@/components/marketing/SectionHeading";
import FeatureList from "@/components/marketing/FeatureList";
import Steps from "@/components/marketing/Steps";
import CTABand from "@/components/marketing/CTABand";
import { ButtonLink } from "@/components/ui/Button";
import Eyebrow from "@/components/marketing/Eyebrow";
import { CTA_HREF, CTA_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Referral contests for nonprofits",
  description:
    "Run a referral contest that grows your email list. Supporters share a link, friends join your list, entries add up — and the Official Rules are handled for you.",
};

export default function ContestsPage() {
  return (
    <>
      <Section tone="tint">
        <div className="max-w-3xl">
          <Eyebrow>Contests</Eyebrow>
          <h1 className="text-[length:var(--text-display)] leading-[1.08]">
            Referral contests that grow your email list.
          </h1>
          <p className="mt-6 text-xl text-warm-700">
            A supporter shares their link. Friends sign up. Every signup is a
            subscriber you keep — and someone wins a prize at the end. We
            handle the rules, so it stays a clean sweepstakes.
          </p>
          <ButtonLink href={CTA_HREF} size="lg" className="mt-8">
            {CTA_LABEL}
          </ButtonLink>
        </div>
      </Section>

      <Section labelledBy="c-how">
        <SectionHeading id="c-how" title="How a referral contest runs." />
        <div className="mt-12">
          <Steps
            steps={[
              {
                title: "A supporter gets a share link",
                body: "Anyone who enters gets a personal link and a reason to pass it on: every friend who signs up through it earns them more entries.",
              },
              {
                title: "Friends join your email list",
                body: "The link lands on a simple signup on your site — name, email, permission to stay in touch. Free to enter, nothing to buy, no donation required.",
              },
              {
                title: "Entries add up, a winner is chosen",
                body: "Each referral earns entries or leaderboard points. When the contest closes, the prize is awarded exactly the way your Official Rules said it would be.",
              },
            ]}
          />
        </div>
      </Section>

      <Section tone="tint" labelledBy="c-rules">
        <SectionHeading
          id="c-rules"
          eyebrow="The rules, handled"
          title="You pick how winning works. We keep it legal."
          lead="A giveaway with free entry is a sweepstakes, and sweepstakes have rules. Yufora generates the Official Rules for your contest and builds the mechanics that keep you inside them."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Random draw",
                body: "Every entry is a ticket. More referrals, more tickets, and the winner is drawn at random when the contest closes.",
              },
              {
                title: "Top-referrer leaderboard",
                body: "A public leaderboard, and the supporter who brings the most friends wins. Good for competitive communities — and it's your call which mode to run.",
              },
              {
                title: "Free entry, always",
                body: "No purchase, no donation, no payment to enter. That's what keeps a referral contest a clean sweepstakes instead of an illegal lottery.",
              },
              {
                title: "Official Rules, generated for your contest",
                body: "Sponsor details, entry period, eligibility, odds language, and how the winner is chosen — the disclosures the law actually requires, written for your contest.",
              },
            ]}
          />
        </div>
      </Section>

      <Section labelledBy="c-list">
        <SectionHeading
          id="c-list"
          eyebrow="The real prize is your list"
          title="Every entry is a supporter you keep."
          lead="A referral contest isn't a moment of attention — it's the fastest honest way to grow your email list."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Entrants join your list",
                body: "Every entry captures a name, an email, and permission to stay in touch — people interested enough to play for your cause.",
              },
              {
                title: "Their friends follow",
                body: "Sharing is the whole game. Every referral lands on your site and joins your list — not a social feed you don't own.",
              },
              {
                title: "You see what's working",
                body: "Who's sharing, who's joining, where they came from. The contest shows you your most connected supporters by name.",
              },
              {
                title: "It feeds everything else",
                body: "A bigger list makes every appeal, every wishlist item, and every email we send for you work harder.",
              },
            ]}
          />
        </div>
      </Section>

      <Section tone="tint" labelledBy="c-status">
        <SectionHeading
          id="c-status"
          eyebrow="Where this stands"
          title="Referral contests are in build."
          lead="We're building this with our first partner nonprofits now, and we won't tell you it's live before it is. Get in touch and you'll be in the first group to run one — and you'll help shape how it works."
        />
      </Section>

      <Section>
        <CTABand
          title="Grow the list first."
          body="Tell us about your organization and the prize you have in mind. We'll come back with how your first referral contest would run."
        />
      </Section>
    </>
  );
}
