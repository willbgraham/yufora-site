import { NO_DONATION_NECESSARY } from "@/lib/giveaways/legal-copy";

/** Sits beside every donation control, never in a footer. */
export default function NoDonationNecessary({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm font-medium text-warm-800 ${className}`}>
      {NO_DONATION_NECESSARY}
    </p>
  );
}
