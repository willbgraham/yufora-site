import {
  MarkDeliveredButton,
  PassToAlternateForm,
  ResendWinnerEmailButton,
} from "@/components/admin/giveaways/WinnerActions";
import { dateTime, longDate } from "@/lib/giveaways/format";
import { TAX_FORM_LIKELY_CENTS } from "@/lib/giveaways/service";
import { stateName } from "@/lib/us-states";

type Claim = {
  id: string;
  rank: number;
  status: string;
  notifiedAt: Date;
  deadlineAt: Date;
  respondedAt: Date | null;
  claimantLegalName: string | null;
  claimantPhone: string | null;
  closedReason: string | null;
  prizeAwardedAt: Date | null;
  entrant: { firstName: string; lastName: string; email: string; state: string };
};

const CLOSED: Record<string, string> = {
  declined: "Declined",
  expired: "Didn't accept by the deadline",
  disqualified: "Not eligible",
};

export default function WinnerPanel({
  campaignId,
  claims,
  alternatesDrawn,
  giveaway,
  now,
}: {
  campaignId: string;
  claims: Claim[];
  alternatesDrawn: number;
  giveaway: { status: string; outcome: string | null; prizeArvCents: number; claimDeadlineDays: number; timezone: string };
  now: Date;
}) {
  const tz = giveaway.timezone;
  const latest = [...claims].sort((a, b) => b.rank - a.rank)[0];
  const exhausted = giveaway.outcome === "unclaimed";

  return (
    <section aria-labelledby="winner-heading" className="rounded-xl border border-teal-100 bg-white p-6">
      <h2 id="winner-heading" className="text-xl">
        {latest && latest.rank > 0 ? `Alternate #${latest.rank}` : "Your winner"}
      </h2>

      {exhausted && (
        <p className="mt-3 rounded-lg bg-warm-50 p-4 text-warm-800">
          No one claimed the prize. Email hello@yufora.com and we&rsquo;ll help you follow your Rules.
        </p>
      )}

      {latest && !exhausted && (
        <div className="mt-3 space-y-3">
          <p className="text-warm-900">
            <span className="font-medium">
              {latest.claimantLegalName ?? `${latest.entrant.firstName} ${latest.entrant.lastName}`}
            </span>{" "}
            · {latest.entrant.email} · {stateName(latest.entrant.state)}
            {latest.claimantPhone ? ` · ${latest.claimantPhone}` : ""}
          </p>
          {latest.status === "notified" && (
            <p className="text-warm-700">
              Notified {longDate(latest.notifiedAt, tz)}. Has until {dateTime(latest.deadlineAt, tz)} to accept.
            </p>
          )}
          {latest.status === "accepted" && (
            <div className="space-y-2 text-warm-700">
              <p className="font-medium text-teal-900">
                Accepted {longDate(latest.respondedAt ?? now, tz)}.
                {latest.prizeAwardedAt ? ` Prize delivered ${longDate(latest.prizeAwardedAt, tz)}.` : ""}
              </p>
              {!latest.prizeAwardedAt && (
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  <li>Send them an affidavit of eligibility and a liability release to sign.</li>
                  <li>
                    {giveaway.prizeArvCents >= TAX_FORM_LIKELY_CENTS
                      ? "Collect a W-9 — a prize at this value is generally reported on Form 1099-MISC. Confirm with your accountant."
                      : "Check with your accountant whether you need a W-9 for a prize at this value."}
                  </li>
                  <li>Deliver the prize, then mark it delivered here.</li>
                </ol>
              )}
            </div>
          )}
          {CLOSED[latest.status] && (
            <p className="text-warm-700">
              {CLOSED[latest.status]}
              {latest.respondedAt ? ` on ${longDate(latest.respondedAt, tz)}` : ""}.
            </p>
          )}

          {giveaway.status === "drawn" && (
            <div className="flex flex-wrap items-start gap-3 pt-2">
              {latest.status === "accepted" && !latest.prizeAwardedAt && <MarkDeliveredButton campaignId={campaignId} />}
              {latest.status === "notified" && <ResendWinnerEmailButton campaignId={campaignId} />}
              {!latest.prizeAwardedAt && (
                <PassToAlternateForm
                  campaignId={campaignId}
                  nextRank={latest.rank < alternatesDrawn ? latest.rank + 1 : null}
                  claimDays={giveaway.claimDeadlineDays}
                  status={latest.status}
                  deadlinePassed={now >= latest.deadlineAt}
                />
              )}
            </div>
          )}
        </div>
      )}

      {claims.length > 1 && (
        <ul className="mt-5 space-y-1 border-t border-warm-100 pt-4 text-sm text-warm-700">
          {claims.map((c) => (
            <li key={c.id}>
              {c.rank === 0 ? "Winner" : `Alternate #${c.rank}`}: {c.entrant.firstName}{" "}
              {c.entrant.lastName.charAt(0)}. — {CLOSED[c.status] ?? (c.status === "accepted" ? "Accepted" : "Notified")}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
