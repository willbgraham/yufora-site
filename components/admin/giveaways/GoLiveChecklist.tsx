import GoLiveButton from "@/components/admin/giveaways/GoLiveButton";
import { checklistRows } from "@/lib/giveaways/display";
import { dateTime } from "@/lib/giveaways/format";
import { sponsorAttestation } from "@/lib/giveaways/legal-copy";
import type { GoLiveCheck } from "@/lib/giveaways/validation";

export default function GoLiveChecklist({
  campaignId,
  checks,
  giveaway,
  goLiveOpen,
  now,
}: {
  campaignId: string;
  checks: GoLiveCheck[];
  giveaway: {
    prizeArvCents: number;
    sponsorLegalName: string;
    sponsorCity: string;
    sponsorState: string;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
  };
  goLiveOpen: boolean;
  now: Date;
}) {
  const rows = checklistRows(checks, giveaway);
  const failing = rows.filter((r) => !r.ok).length;
  const blockedReason = !goLiveOpen
    ? "Going live opens after legal review."
    : failing > 0
      ? `Fix the ${failing === 1 ? "item" : `${failing} items`} above to go live.`
      : null;

  return (
    <section aria-labelledby="golive-heading" className="rounded-xl border border-warm-200 bg-white p-6">
      <h2 id="golive-heading" className="text-xl">Ready to go live?</h2>
      {!goLiveOpen && (
        <p className="mt-3 rounded-lg border border-warm-200 bg-warm-50 p-4 text-sm text-warm-800">
          <strong className="text-warm-900">Going live is waiting on legal review.</strong> A
          promotions lawyer is reviewing our Official Rules template. You can finish
          every step and preview it all now — going live opens when the review is
          done, and we&rsquo;ll email you that day.
        </p>
      )}
      <ul className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span aria-hidden="true" className={r.ok ? "text-teal-700" : "text-pink-700"}>
              {r.ok ? "✓" : "✗"}
            </span>
            <span className="sr-only">{r.ok ? "Done:" : "To do:"}</span>
            <span className={r.ok ? "text-warm-800" : "text-warm-900"}>{r.text}</span>
            {r.fix && (
              <a href={r.fix.href} className="font-medium text-pink-700 hover:underline">
                {r.fix.label} →
              </a>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <GoLiveButton
          campaignId={campaignId}
          ready={goLiveOpen && failing === 0}
          blockedReason={blockedReason}
          attestation={sponsorAttestation(giveaway.sponsorLegalName || "Our organization")}
          startsLater={giveaway.startsAt > now ? dateTime(giveaway.startsAt, giveaway.timezone) : null}
        />
      </div>
    </section>
  );
}
