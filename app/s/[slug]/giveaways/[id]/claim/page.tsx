import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/layout/Container";
import ClaimForm from "@/components/giveaways/ClaimForm";
import { getClaimView } from "@/lib/data/giveaways";
import { dateTime, inlinePrize, longDate, money } from "@/lib/giveaways/format";
import { claimAttestation } from "@/lib/giveaways/legal-copy";

export const metadata: Metadata = {
  title: "Claim your prize",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ t?: string }>;
};

export default async function ClaimPage({ params, searchParams }: Props) {
  const { slug, id } = await params;
  const { t } = await searchParams;
  const now = new Date();
  const view = await getClaimView(t ?? null, now);
  const base = `/s/${slug}/giveaways/${id}`;

  let body: React.ReactNode;
  if (!view || view.charity.slug !== slug || view.giveaway.id !== id) {
    body = (
      <>
        <h1 className="text-3xl">This link doesn&rsquo;t work anymore.</h1>
        <p className="mt-3 text-warm-700">
          If you were notified about a prize, use the link in your most recent email.
        </p>
      </>
    );
  } else {
    const { claim, entrant, giveaway: g, charity } = view;
    const tz = g.timezone;
    if (claim.status === "accepted") {
      body = (
        <>
          <h1 className="text-3xl">Congratulations, {entrant.firstName}.</h1>
          <p className="mt-3 text-warm-700">
            You accepted the prize on {longDate(claim.respondedAt ?? now, tz)}.{" "}
            {charity.name} will email you at {entrant.email} to finish up — usually
            within a few business days.
          </p>
        </>
      );
    } else if (claim.status === "declined") {
      body = (
        <>
          <h1 className="text-3xl">You declined the prize.</h1>
          <p className="mt-3 text-warm-700">
            Thanks for letting {charity.name} know — it passes to the next person drawn.
          </p>
        </>
      );
    } else if (claim.status !== "notified" || view.expired) {
      body = (
        <>
          <h1 className="text-3xl">This claim window has closed.</h1>
          <p className="mt-3 text-warm-700">
            It closed on {dateTime(claim.deadlineAt, tz)}. As the Official Rules
            explain, the prize passes to the next person drawn.
          </p>
        </>
      );
    } else {
      body = (
        <>
          <h1 className="text-3xl">
            {claim.rank === 0 ? `You won, ${entrant.firstName}!` : `The prize is yours to claim, ${entrant.firstName}.`}
          </h1>
          <p className="mt-3 text-warm-700">
            {charity.name}&rsquo;s giveaway for <strong>{inlinePrize(g.prizeName)}</strong> (approx.
            value {money(g.prizeArvCents)}). Accept it by{" "}
            <strong>{dateTime(claim.deadlineAt, tz)}</strong>.
          </p>
          <p className="mt-2 text-sm text-warm-600">
            {charity.name} will contact you to confirm eligibility and arrange the
            prize. You will never be asked to pay anything to receive it.
          </p>
          <div className="mt-8 max-w-lg">
            <ClaimForm
              token={t as string}
              path={`${base}/claim`}
              attestation={claimAttestation({ state: entrant.state, sponsorLegalName: g.sponsorLegalName })}
            />
          </div>
        </>
      );
    }
  }

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <Link href={`${base}/rules`} className="text-sm text-warm-600 hover:text-pink-700">
        Official Rules
      </Link>
      <div className="mt-4">{body}</div>
    </Container>
  );
}
