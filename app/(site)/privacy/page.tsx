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
        This is a plain-English summary while Yufora is young. It will
        be replaced by a full policy reviewed by counsel before launch.
      </p>
      <Prose>
        <h2>What we collect</h2>
        <p>
          When you fill in our get-started form we collect the details you
          give us: your organization&rsquo;s name, your name, your email, your
          role, what you&rsquo;re interested in, and anything you type in the
          message field. That&rsquo;s it.
        </p>

        <h2>Why we collect it</h2>
        <p>
          Only to get back to you about Yufora and to understand what to build
          first. We do not add you to a newsletter and we do not use it for
          advertising.
        </p>

        <h2>What we don&rsquo;t do</h2>
        <p>
          <strong>
            We will never sell, rent, or share your details — not with
            advertisers, not with other nonprofits, not with anyone.
          </strong>{" "}
          This site runs no analytics or advertising cookies and does not track
          you.
        </p>

        <h2>How it&rsquo;s stored</h2>
        <p>
          Your submission reaches us by email through our email provider. We
          keep it only as long as we need it to follow up with you, and
          you can ask us to delete it at any time.
        </p>

        <h2>Contact</h2>
        <p>
          Questions, or want your details removed? Email{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>
      </Prose>
    </Section>
  );
}
