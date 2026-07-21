import type { Metadata } from "next";
import Section from "@/components/layout/Section";
import SectionHeading from "@/components/marketing/SectionHeading";
import FeatureList from "@/components/marketing/FeatureList";
import Steps from "@/components/marketing/Steps";
import CTABand from "@/components/marketing/CTABand";
import Eyebrow from "@/components/marketing/Eyebrow";
import { ButtonLink } from "@/components/ui/Button";
import { CTA_HREF, CTA_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Live donor wall for your website",
  description:
    "A live wall of giving activity on your own site — connected read-only to the Stripe account you already use. Set up in minutes, no shop required.",
};

export default function DonorWallPage() {
  return (
    <>
      <Section tone="tint">
        <div className="max-w-3xl">
          <Eyebrow>Donor wall</Eyebrow>
          <h1 className="text-[length:var(--text-display)] leading-[1.08]">
            Your donors are giving. Let your website show it.
          </h1>
          <p className="mt-6 text-xl text-warm-700">
            A live wall on your site: money raised this month, gifts as they
            happen, and the supporters you choose to recognize. It works with
            the Stripe account you already use — no shop, no migration, no
            developer.
          </p>
          <ButtonLink href={CTA_HREF} size="lg" className="mt-8">
            {CTA_LABEL}
          </ButtonLink>
        </div>
      </Section>

      <Section labelledBy="dw-how">
        <SectionHeading id="dw-how" title="Up in minutes" />
        <div className="mt-12">
          <Steps
            steps={[
              {
                title: "Connect your Stripe — read-only",
                body: "One click through Stripe's own screen. We can see gift amounts and dates. We cannot move money, see card details, or touch anything else.",
              },
              {
                title: "Paste one snippet",
                body: "The wall appears on your site and sizes itself — homepage, campaign page, wherever giving should be visible.",
              },
              {
                title: "Add the names you want to honor",
                body: "The live feed is anonymous by design. Names appear only when you add supporters who've told you it's okay.",
              },
            ]}
          />
        </div>
      </Section>

      <Section tone="tint" labelledBy="dw-trust">
        <SectionHeading
          id="dw-trust"
          eyebrow="Why it's safe to say yes"
          title="Built like something a nonprofit can defend."
        />
        <div className="mt-10">
          <FeatureList
            items={[
              {
                title: "Read-only, structurally",
                body: "The Stripe connection is scoped so we couldn't move money if we wanted to. That's not a promise — it's a permission.",
              },
              {
                title: "We store none of it",
                body: "The wall reads your Stripe activity live and keeps nothing. Disconnect any time and it all stops.",
              },
              {
                title: "No donor is ever named by data",
                body: "Payment records never become public names. The live feed says “Someone gave $50” — full stop.",
              },
              {
                title: "Names only with permission",
                body: "The recognized-supporters list is yours to curate, exactly like the donor list in your annual report.",
              },
            ]}
          />
        </div>
      </Section>

      <Section labelledBy="dw-upsell">
        <SectionHeading
          id="dw-upsell"
          title="Want names and faces on the wall automatically?"
          lead="That takes consent from the donor — and the natural place to ask is the moment they give. When donations run through your Yufora wishlist shop, every donor chooses at checkout: name, name and amount, or anonymous. The wall fills itself, permission included."
        />
        <ButtonLink href="/shop" variant="ghost" className="mt-6">
          How the wishlist shop works →
        </ButtonLink>
      </Section>

      <Section tone="tint">
        <CTABand
          title="Put giving on display."
          body="Tell us about your organization and we'll get your wall live — usually the same week."
        />
      </Section>
    </>
  );
}
