import type { Metadata } from "next";
import Section from "@/components/layout/Section";
import Prose from "@/components/marketing/Prose";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Yufora handles the information you share with us.",
};

export default function PrivacyPage() {
  return (
    <Section>
      <h1 className="mb-2 text-4xl">Privacy</h1>
      <p className="mb-10 text-warm-600">
        Written in plain English on purpose. A counsel-reviewed version will
        replace this before full launch — but everything below is how the
        product actually works today. Last updated July 2026.
      </p>
      <Prose>
        <h2>Who we are</h2>
        <p>
          Yufora, LLC (&ldquo;Yufora&rdquo;, &ldquo;we&rdquo;) builds
          fundraising tools and provides marketing services for nonprofits.
          Questions about anything here:{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>

        <h2>If you fill in our get-started form</h2>
        <p>
          We collect what you give us: your organization&rsquo;s name, your
          name, email, role, interests, and message. We use it only to reply
          and to understand what to build. No newsletter, no advertising, no
          sharing.
        </p>

        <h2>If you run a charity account with us</h2>
        <p>
          We store your email (for sign-in links — we never store passwords,
          because there are none), your organization&rsquo;s details, and the
          content you create: products, photos, and settings. Signing in sets
          a session cookie; it&rsquo;s the only kind of cookie we use.
          <strong> This site runs no analytics or advertising trackers.</strong>
        </p>

        <h2>If you donate through a Yufora shop</h2>
        <p>
          Your payment is processed by <strong>Stripe</strong> on the
          charity&rsquo;s own Stripe account — the charity is the merchant of
          record, and card details never touch Yufora&rsquo;s servers or the
          charity&rsquo;s website. We store the donation record: your name and
          email (as you entered them at checkout), the amount, and the item
          you supported. That record belongs to the charity you gave to; we
          process it on their behalf and never use it for our own marketing,
          never sell it, and never contact you except to confirm your gift.
        </p>

        <h2>The donor wall</h2>
        <p>
          Public display is <strong>opt-in at checkout</strong>: you choose
          name, name and amount, or anonymous — and choosing nothing means
          anonymous. The wall never shows more than you picked. If you change
          your mind later, tell the charity: they can permanently hide your
          gift with one click, and nothing can make it public again.
        </p>

        <h2>The standalone donor wall (charity&rsquo;s own Stripe)</h2>
        <p>
          Some charities connect their existing Stripe account to us{" "}
          <strong>read-only</strong> to show live giving activity. For those
          walls we read gift amounts and dates at display time and{" "}
          <strong>store none of it</strong>. Donor identities from payment
          records are never shown — the feed says &ldquo;Someone gave
          $50&rdquo;, nothing more. Names appear only when the charity adds a
          supporter who gave them permission.
        </p>

        <h2>Email</h2>
        <p>
          We send email through Resend (our email provider): sign-in links,
          donation confirmations, and replies to things you sent us. Every
          email has a real reply path to a human.
        </p>

        <h2>Retention and deletion</h2>
        <p>
          We keep data only as long as it serves the purposes above. Donation
          records are kept for the charity&rsquo;s bookkeeping. Want your form
          submission or account deleted, or have a question about a donation
          record? Email{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> — a
          person will handle it.
        </p>

        <h2>What we will never do</h2>
        <p>
          <strong>
            We will never sell, rent, or share your details — not with
            advertisers, not with other organizations, not with anyone.
          </strong>
        </p>

        <h2>Changes</h2>
        <p>
          If this policy changes materially, we&rsquo;ll note it here with a
          new date. The plain-English promise doesn&rsquo;t change.
        </p>
      </Prose>
    </Section>
  );
}
