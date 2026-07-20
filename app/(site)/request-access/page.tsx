import type { Metadata } from "next";
import Section from "@/components/layout/Section";
import SectionHeading from "@/components/marketing/SectionHeading";
import LeadForm from "@/components/forms/LeadForm";

export const metadata: Metadata = {
  title: "Request early access",
  description:
    "Tell us what you're planning. We're onboarding a small first group of nonprofits.",
};

export default function RequestAccessPage() {
  return (
    <Section labelledBy="ra-heading">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          as="h1"
          id="ra-heading"
          title="Request early access."
          lead="We're taking on a small number of nonprofits for the first round. Tell us what you're planning this year and a real person will get back to you within two business days."
        />
        <div className="mt-10 rounded-xl border border-warm-200 bg-white p-6 sm:p-8">
          <LeadForm />
        </div>
      </div>
    </Section>
  );
}
