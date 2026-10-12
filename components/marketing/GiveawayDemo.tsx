import Image from "next/image";
import GiveawayCard from "@/components/giveaways/GiveawayCard";

/**
 * The real giveaway card with example data — same principle as ShopDemo:
 * marketing shows the actual component, so it can't drift. Example org is
 * the MELBA Foundation (music education), used with their blessing.
 *
 * A fixed "now" and an end date in the same year keep it from ever looking
 * stale (no year is shown). `inert` makes it an illustration: nothing in
 * it can be focused or submitted.
 */
const NOW = new Date("2026-11-18T17:00:00Z");

const DEMO = {
  status: "live",
  prizeName: "A handmade acoustic guitar",
  prizeArvCents: 120_000,
  prizePhotoUrl: "/demo-shop-guitar.webp",
  timezone: "America/Chicago",
  startsAt: new Date("2026-11-01T05:00:00Z"),
  endsAt: new Date("2026-12-01T06:00:00Z"),
  drawAt: new Date("2026-12-02T06:00:00Z"),
  perPersonCap: 30,
  donationsEnabled: true,
  centsPerEntry: 1000,
  sponsorLegalName: "The MELBA Foundation, Inc.",
};

export default function GiveawayDemo({ className }: { className?: string }) {
  return (
    <figure className={className}>
      <div className="rounded-xl border border-warm-200 bg-warm-50 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <Image
            src="/demo-melba-logo.png"
            alt="MELBA Foundation"
            width={2086}
            height={826}
            className="h-7 w-auto"
          />
        </div>
        <div inert className="select-none">
          <GiveawayCard
            giveaway={DEMO}
            charityName="MELBA Foundation"
            now={NOW}
            context="demo"
            rulesHref="#"
            verifyHref="#"
          />
        </div>
      </div>
      <figcaption className="mt-3 text-center text-sm text-warm-600">
        An example giveaway — yours shows your prize, on your website.
      </figcaption>
    </figure>
  );
}
